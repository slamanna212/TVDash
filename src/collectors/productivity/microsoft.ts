import type { Env, M365Service, M365Issue } from '../../types';
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
      throw new Error('Failed to obtain M365 access token');
    }

    return await fetchWithCache(
      env,
      'm365-status',
      'm365',
      async () => {
        // Fetch health overviews
        const healthOverviews = await fetchM365HealthOverviews(accessToken);

        // Fetch current issues
        const issues = await fetchM365Issues(accessToken);

        // Build services list
        const services: M365Service[] = healthOverviews.map(overview => {
          const serviceIssues = issues.filter(issue => issue.service === overview.id);

          return {
            name: overview.service,
            status: mapM365Status(overview.status),
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
      300 // Cache for 5 minutes
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

    const tokenData = await response.json() as { access_token: string; expires_in: number };

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

  if (statusLower.includes('servicedegradation')) {
    return 'degraded';
  }

  if (statusLower.includes('serviceinterruption') || statusLower.includes('serviceoutage')) {
    return 'outage';
  }

  if (statusLower.includes('serviceoperational')) {
    return 'operational';
  }

  return 'unknown';
}
