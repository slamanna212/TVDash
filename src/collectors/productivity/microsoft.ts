import type { Env, M365Service } from '../../types';
import { fetchWithCache, getCachedData, setCachedData } from '../../utils/cache';

interface M365HealthOverview {
  service: string;
  status: string;
  id: string;
}

interface M365IssueResponse {
  id: string;
  title: string;
  impactDescription: string;
  classification: string;
  status: string;
  service: string;
  startDateTime: string;
  lastModifiedDateTime: string;
}

export async function collectM365Status(env: Env): Promise<{
  overall: string;
  services: M365Service[];
  lastChecked: string;
}> {
  try {
    // Get access token
    const accessToken = await getM365AccessToken(env);

    if (!accessToken) {
      // Return early with unknown status if credentials aren't configured or invalid
      return {
        overall: 'unknown',
        services: [],
        lastChecked: new Date().toISOString(),
      };
    }

    return await fetchWithCache(
      env,
      'm365-status',
      'm365',
      async () => {
        // Fetch health overviews
        const healthOverviews = await fetchM365HealthOverviews(accessToken);
        console.log(`Fetched ${healthOverviews.length} M365 services`);

        // Fetch current issues
        const issues = await fetchM365Issues(accessToken);
        console.log(`Fetched ${issues.length} M365 issues`);

        // Build services list
        const services: M365Service[] = healthOverviews.map(overview => {
          const mappedStatus = mapM365Status(overview.status);
          console.log(`M365 Service: ${overview.service} - Raw Status: "${overview.status}" - Mapped: ${mappedStatus}`);

          const serviceIssues = issues.filter(issue => issue.service === overview.id);

          return {
            name: overview.service,
            status: mappedStatus,
            issues: serviceIssues.map(issue => ({
              id: issue.id,
              title: issue.title,
              severity: issue.classification || 'info',
              startTime: issue.startDateTime,
              lastUpdate: issue.lastModifiedDateTime,
            })),
          };
        });

        // Determine overall status
        let overall: string = 'operational';
        const hasOutage = services.some(s => s.status === 'outage');
        const hasDegraded = services.some(s => s.status === 'degraded');

        if (hasOutage) {
          overall = 'outage';
        } else if (hasDegraded) {
          overall = 'degraded';
        }

        return {
          overall,
          services,
          lastChecked: new Date().toISOString(),
        };
      },
      480 // Cache for 8 minutes (matches 10-minute cron interval)
    );
  } catch (error) {
    console.error('Error collecting M365 status:', error);
    return {
      overall: 'unknown',
      services: [],
      lastChecked: new Date().toISOString(),
    };
  }
}

async function getM365AccessToken(env: Env): Promise<string | null> {
  // Check if we have credentials
  if (!env.M365_TENANT_ID || !env.M365_CLIENT_ID || !env.M365_CLIENT_SECRET) {
    console.warn('M365 credentials not configured');
    return null;
  }

  // Try to get cached token
  const cachedToken = await getCachedData<{ access_token: string }>(
    env,
    'm365-token',
    'm365-auth'
  );

  if (cachedToken) {
    return cachedToken.access_token;
  }

  // Request new token
  try {
    const tokenUrl = `https://login.microsoftonline.com/${env.M365_TENANT_ID}/oauth2/v2.0/token`;

    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: env.M365_CLIENT_ID,
        client_secret: env.M365_CLIENT_SECRET,
        scope: 'https://graph.microsoft.com/.default',
        grant_type: 'client_credentials',
      }),
    });

    if (!response.ok) {
      throw new Error(`Token request failed: ${response.status}`);
    }

    const tokenData = await response.json() ;

    // Cache the token (with 5 minute buffer before expiration)
    await setCachedData(
      env,
      'm365-token',
      'm365-auth',
      tokenData,
      tokenData.expires_in - 300
    );

    return tokenData.access_token;
  } catch (error) {
    console.error('Error getting M365 access token:', error);
    return null;
  }
}

async function fetchM365HealthOverviews(accessToken: string): Promise<M365HealthOverview[]> {
  const response = await fetch(
    'https://graph.microsoft.com/v1.0/admin/serviceAnnouncement/healthOverviews',
    {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json',
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch health overviews: ${response.status}`);
  }

  const data = await response.json();
  return data.value || [];
}

async function fetchM365Issues(accessToken: string): Promise<M365IssueResponse[]> {
  const response = await fetch(
    'https://graph.microsoft.com/v1.0/admin/serviceAnnouncement/issues',
    {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json',
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch issues: ${response.status}`);
  }

  const data = await response.json();
  return data.value || [];
}

function mapM365Status(status: string): 'operational' | 'degraded' | 'outage' | 'unknown' {
  const statusLower = status.toLowerCase();

  // Log unexpected status values for debugging
  if (!statusLower.includes('operational') &&
      !statusLower.includes('degradation') &&
      !statusLower.includes('interruption') &&
      !statusLower.includes('restoring') &&
      !statusLower.includes('restored') &&
      !statusLower.includes('extended') &&
      !statusLower.includes('recovery') &&
      !statusLower.includes('investigating') &&
      !statusLower.includes('falsepositive')) {
    console.warn(`Unmapped M365 status value: ${status}`);
  }

  // Outage states
  if (statusLower.includes('interruption') ||
      statusLower.includes('outage') ||
      statusLower.includes('investigating')) {
    return 'outage';
  }

  // Degraded states
  if (statusLower.includes('degradation') ||
      statusLower.includes('restoring') ||
      statusLower.includes('extended')) {
    return 'degraded';
  }

  // Operational states
  if (statusLower.includes('operational') ||
      statusLower.includes('restored') ||
      statusLower.includes('falsepositive')) {
    return 'operational';
  }

  return 'unknown';
}
