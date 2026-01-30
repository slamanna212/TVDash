import type { Env, CloudProvider, CloudIncident } from '../../types';
import { fetchWithCache } from '../../utils/cache';

const GCP_STATUS_URL = 'https://status.cloud.google.com/incidents.json';

interface GCPIncident {
  id: string;
  number: string;
  begin: string;
  created: string;
  end?: string;
  external_desc: string;
  service_name: string;
  service_key: string;
  severity: string;
  currently_affected_locations?: Array<{
    id: string;
    title: string;
  }>;
  most_recent_update: {
    created: string;
    text: string;
    status: string;
  };
}

export async function collectGCPStatus(env: Env): Promise<CloudProvider> {
  try {
    return await fetchWithCache(
      env,
      'gcp-status',
      'gcp',
      async () => {
        const response = await fetch(GCP_STATUS_URL, {
          headers: {
            'User-Agent': 'MSP-Dashboard-Monitor/1.0',
            'Accept': 'application/json',
          },
        });

        if (!response.ok) {
          throw new Error(`GCP API returned ${response.status}`);
        }

        const gcpIncidents: GCPIncident[] = await response.json();
        const incidents: CloudIncident[] = [];

        // Filter for active incidents
        for (const gcpInc of gcpIncidents) {
          // Skip if incident has ended
          if (gcpInc.end) {
            continue;
          }

          // Check if incident is recent (within last 48 hours)
          const beginDate = new Date(gcpInc.begin);
          const hoursSinceBegin = (Date.now() - beginDate.getTime()) / (1000 * 60 * 60);

          if (hoursSinceBegin < 48) {
            const regions = gcpInc.currently_affected_locations?.map(loc => loc.title) || [];

            incidents.push({
              title: `${gcpInc.service_name}: ${gcpInc.external_desc}`,
              severity: mapGCPSeverity(gcpInc.severity),
              services: [gcpInc.service_name],
              regions: regions.length > 0 ? regions : undefined,
              startTime: gcpInc.begin,
              message: gcpInc.most_recent_update?.text || gcpInc.external_desc,
            });
          }
        }

        // Determine overall status
        let status: 'operational' | 'degraded' | 'outage' | 'unknown' = 'operational';

        if (incidents.length > 0) {
          const hasCritical = incidents.some(inc => inc.severity === 'critical');
          const hasMajor = incidents.some(inc => inc.severity === 'major');

          if (hasCritical) {
            status = 'outage';
          } else if (hasMajor || incidents.length > 2) {
            status = 'degraded';
          } else {
            status = 'operational';
          }
        }

        return {
          name: 'Google Cloud',
          status,
          incidents,
          lastUpdated: new Date().toISOString(),
        };
      },
      300 // Cache for 5 minutes
    );
  } catch (error) {
    console.error('Error collecting GCP status:', error);
    return {
      name: 'Google Cloud',
      status: 'unknown',
      incidents: [],
      lastUpdated: new Date().toISOString(),
    };
  }
}

function mapGCPSeverity(severity: string): string {
  switch (severity.toLowerCase()) {
    case 'high':
      return 'critical';
    case 'medium':
      return 'major';
    case 'low':
      return 'minor';
    default:
      return 'info';
  }
}
