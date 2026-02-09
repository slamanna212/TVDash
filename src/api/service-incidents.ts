import type { Env } from '../types';
import { withApiCache } from '../utils/api-cache';

interface IncidentUpdate {
  body: string;
  status: string;
  createdAt: string;
}

interface Incident {
  title: string;
  impact: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  affectedComponents: string[];
  updates: IncidentUpdate[];
}

interface ServiceIncidentsResponse {
  service: {
    id: number;
    name: string;
    status: string;
    statusPageUrl: string | null;
  };
  incidents: Incident[];
}

interface ServiceRow {
  id: number;
  name: string;
  check_type: string;
  statuspage_id: string | null;
  check_url: string | null;
}

async function fetchStatuspageIncidents(baseUrl: string): Promise<Incident[]> {
  // Normalize URL - remove trailing slash
  const url = baseUrl.replace(/\/$/, '');
  const apiUrl = `${url}/api/v2/incidents/unresolved.json`;

  const response = await fetch(apiUrl, {
    headers: { 'Accept': 'application/json' },
    cf: { cacheTtl: 60 },
  });

  if (!response.ok) {
    console.error(`Statuspage incidents fetch failed: ${response.status} from ${apiUrl}`);
    return [];
  }

  const data = await response.json() as any;
  const incidents = data?.incidents || [];

  return incidents.map((inc: any) => ({
    title: inc.name || 'Unknown Incident',
    impact: inc.impact || 'none',
    status: inc.status || 'investigating',
    createdAt: inc.created_at || '',
    updatedAt: inc.updated_at || '',
    affectedComponents: (inc.components || []).map((c: any) => c.name),
    updates: (inc.incident_updates || []).map((u: any) => ({
      body: u.body || '',
      status: u.status || '',
      createdAt: u.created_at || '',
    })),
  }));
}

async function fetchM365Incidents(env: Env): Promise<Incident[]> {
  const result = await env.DB.prepare(`
    SELECT service_name, status, issues, checked_at
    FROM m365_current
    WHERE status != 'operational'
    ORDER BY service_name
  `).all();

  if (!result.success) return [];

  const incidents: Incident[] = [];
  for (const row of result.results as any[]) {
    let issues: any[] = [];
    try {
      issues = JSON.parse(row.issues || '[]');
    } catch { continue; }

    for (const issue of issues) {
      incidents.push({
        title: issue.title || `${row.service_name} issue`,
        impact: issue.severity === 'critical' ? 'critical' : issue.severity === 'warning' ? 'major' : 'minor',
        status: 'investigating',
        createdAt: issue.startTime || row.checked_at,
        updatedAt: issue.lastUpdate || row.checked_at,
        affectedComponents: [row.service_name],
        updates: [],
      });
    }
  }

  return incidents;
}

async function fetchGWorkspaceIncidents(env: Env): Promise<Incident[]> {
  const result = await env.DB.prepare(`
    SELECT overall_status, incidents
    FROM gworkspace_status
    ORDER BY checked_at DESC
    LIMIT 1
  `).first() as any;

  if (!result) return [];

  let rawIncidents: any[] = [];
  try {
    rawIncidents = JSON.parse(result.incidents || '[]');
  } catch { return []; }

  return rawIncidents
    .filter((inc: any) => !inc.end)
    .map((inc: any) => ({
      title: inc.service_name
        ? `${inc.service_name}: ${inc.description || 'Service disruption'}`
        : inc.description || 'Service disruption',
      impact: inc.severity === 'high' ? 'major' : 'minor',
      status: 'investigating',
      createdAt: inc.begin || '',
      updatedAt: inc.modified || inc.begin || '',
      affectedComponents: inc.service_name ? [inc.service_name] : [],
      updates: (inc.updates || []).map((u: any) => ({
        body: u.update || '',
        status: '',
        createdAt: u.modified || '',
      })),
    }));
}

export async function getServiceIncidents(env: Env, serviceId: number): Promise<Response> {
  try {
    const data = await withApiCache(
      env,
      `api:service-incidents:${serviceId}`,
      120, // 2 minute cache
      async () => {
        // Look up the service
        const service = await env.DB.prepare(`
          SELECT id, name, check_type, statuspage_id, check_url
          FROM services WHERE id = ?
        `).bind(serviceId).first() as ServiceRow | null;

        if (!service) {
          return null;
        }

        // Get current status from status_history
        const statusRow = await env.DB.prepare(`
          SELECT status FROM status_history
          WHERE service_id = ?
          ORDER BY checked_at DESC LIMIT 1
        `).bind(serviceId).first() as { status: string } | null;

        const currentStatus = statusRow?.status || 'unknown';

        const response: ServiceIncidentsResponse = {
          service: {
            id: service.id,
            name: service.name,
            status: currentStatus,
            statusPageUrl: service.statuspage_id || service.check_url || null,
          },
          incidents: [],
        };

        // Fetch incidents based on check_type
        if (service.check_type === 'statuspage' && service.statuspage_id) {
          response.incidents = await fetchStatuspageIncidents(service.statuspage_id);
        } else if (service.check_type === 'custom') {
          // Proofpoint / CrowdStrike - no structured API, just provide link
          // incidents stays empty, frontend will show link
        } else if (service.check_type === 'api') {
          // Microsoft 365 (id=12) or Google Workspace (id=13)
          if (service.name === 'Microsoft 365') {
            response.incidents = await fetchM365Incidents(env);
          } else if (service.name === 'Google Workspace') {
            response.incidents = await fetchGWorkspaceIncidents(env);
          }
        }
        // http check_type: no upstream status page, incidents stays empty

        return response;
      }
    );

    if (data === null) {
      return new Response(JSON.stringify({ error: 'Service not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify(data), {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=60',
      },
    });
  } catch (error) {
    console.error(`Error fetching incidents for service ${serviceId}:`, error);
    return new Response(JSON.stringify({
      error: 'Failed to fetch service incidents',
      message: error instanceof Error ? error.message : 'Unknown error',
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
