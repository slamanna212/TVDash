import type { Env, CloudProvider, CloudIncident } from '../../types';
import { parseRSSFeed } from '../rss-parser';
import { fetchWithCache } from '../../utils/cache';

const AZURE_RSS_FEED = 'https://azure.status.microsoft/en-us/status/feed/';

export async function collectAzureStatus(env: Env): Promise<CloudProvider> {
  try {
    return await fetchWithCache(
      env,
      'azure-status',
      'azure',
      async () => {
        const feed = await parseRSSFeed(AZURE_RSS_FEED);
        const incidents: CloudIncident[] = [];

        // Parse recent incidents (check last 10 items)
        const recentItems = feed.items.slice(0, 10);

        for (const item of recentItems) {
          // Check if this is an active incident (not resolved)
          const isActive = !item.title.toLowerCase().includes('resolved') &&
                          !item.description.toLowerCase().includes('resolved');

          if (isActive) {
            // Check if it's recent (within last 24 hours)
            const pubDate = new Date(item.pubDate);
            const hoursSincePublished = (Date.now() - pubDate.getTime()) / (1000 * 60 * 60);

            if (hoursSincePublished < 24) {
              incidents.push({
                title: item.title,
                severity: determineAzureSeverity(item.title, item.description),
                regions: extractAzureRegions(item.description),
                services: extractAzureServices(item.title),
                startTime: item.pubDate,
                message: item.description,
              });
            }
          }
        }

        // Determine overall status
        let status: 'operational' | 'degraded' | 'outage' | 'unknown' = 'operational';

        if (incidents.length > 0) {
          const hasCritical = incidents.some(inc => inc.severity === 'critical');
          const hasMajor = incidents.some(inc => inc.severity === 'major');

          if (hasCritical) {
            status = 'outage';
          } else if (hasMajor) {
            status = 'degraded';
          } else {
            status = 'degraded';
          }
        }

        return {
          name: 'Azure',
          status,
          incidents,
          lastUpdated: new Date().toISOString(),
        };
      },
      300 // Cache for 5 minutes
    );
  } catch (error) {
    console.error('Error collecting Azure status:', error);
    return {
      name: 'Azure',
      status: 'unknown',
      incidents: [],
      lastUpdated: new Date().toISOString(),
    };
  }
}

function determineAzureSeverity(title: string, description: string): string {
  const combined = `${title} ${description}`.toLowerCase();

  if (combined.includes('outage') || combined.includes('unavailable')) {
    return 'critical';
  }

  if (combined.includes('degraded') || combined.includes('degradation')) {
    return 'major';
  }

  if (combined.includes('advisory') || combined.includes('information')) {
    return 'info';
  }

  return 'minor';
}

function extractAzureRegions(description: string): string[] {
  const regions: string[] = [];
  const regionPatterns = [
    /east us/gi,
    /west us/gi,
    /central us/gi,
    /north central us/gi,
    /south central us/gi,
    /west europe/gi,
    /north europe/gi,
  ];

  for (const pattern of regionPatterns) {
    const matches = description.match(pattern);
    if (matches) {
      regions.push(...matches.map(m => m.charAt(0).toUpperCase() + m.slice(1).toLowerCase()));
    }
  }

  return [...new Set(regions)]; // Remove duplicates
}

function extractAzureServices(title: string): string[] {
  const services: string[] = [];

  const serviceKeywords = [
    'Virtual Machines',
    'Storage',
    'App Service',
    'SQL Database',
    'Azure AD',
    'Entra ID',
    'Cosmos DB',
    'Functions',
  ];

  for (const service of serviceKeywords) {
    if (title.toLowerCase().includes(service.toLowerCase())) {
      services.push(service);
    }
  }

  return services.length > 0 ? services : ['Azure Services'];
}
