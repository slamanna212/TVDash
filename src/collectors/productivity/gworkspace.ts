import type { Env } from '../../types';
import { fetchWithCache } from '../../utils/cache';

const GWORKSPACE_INCIDENTS_URL = 'https://www.google.com/appsstatus/dashboard/incidents.json';

interface GWorkspaceIncident {
  id: string;
  service_name: string;
  service_key: string;
  severity: string;
  begin: string;
  end?: string;
  external_desc: string;
  most_recent_update?: {
    text: string;
    created: string;
  };
}

export async function collectGWorkspaceStatus(env: Env): Promise<{
  overall: string;
  services: Array<{
    name: string;
    status: 'operational' | 'degraded' | 'outage' | 'unknown';
    incident?: {
      title: string;
      description: string;
      startTime: string;
    };
  }>;
  lastChecked: string;
}> {
  try {
    return await fetchWithCache(
      env,
      'gworkspace-status',
      'gworkspace',
      async () => {
        const response = await fetch(GWORKSPACE_INCIDENTS_URL, {
          headers: {
            'User-Agent': 'MSP-Dashboard-Monitor/1.0',
            'Accept': 'application/json',
          },
        });

        if (!response.ok) {
          throw new Error(`Google Workspace API returned ${response.status}`);
        }

        const incidents: GWorkspaceIncident[] = await response.json();

        // Key services to track
        const trackedServices = [
          { key: 'gmail', name: 'Gmail' },
          { key: 'drive', name: 'Google Drive' },
          { key: 'meet', name: 'Google Meet' },
          { key: 'calendar', name: 'Google Calendar' },
          { key: 'docs', name: 'Google Docs' },
        ];

        const services = trackedServices.map(service => {
          // Find active incidents for this service
          const activeIncident = incidents.find(
            inc => inc.service_key === service.key && !inc.end
          );

          if (activeIncident) {
            return {
              name: service.name,
              status: mapGWorkspaceSeverity(activeIncident.severity),
              incident: {
                title: activeIncident.external_desc,
                description: activeIncident.most_recent_update?.text || activeIncident.external_desc,
                startTime: activeIncident.begin,
              },
            };
          }

          return {
            name: service.name,
            status: 'operational' as const,
          };
        });

        // Determine overall status
        let overall = 'operational';
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
    console.error('Error collecting Google Workspace status:', error);
    return {
      overall: 'unknown',
      services: [],
      lastChecked: new Date().toISOString(),
    };
  }
}

function mapGWorkspaceSeverity(severity: string): 'operational' | 'degraded' | 'outage' | 'unknown' {
  switch (severity.toLowerCase()) {
    case 'high':
      return 'outage';
    case 'medium':
      return 'degraded';
    case 'low':
      return 'degraded';
    default:
      return 'unknown';
  }
}
