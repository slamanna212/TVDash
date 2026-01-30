import type { Env, M365Service, M365Issue, ServiceStatus } from '../types';
import { withApiCache } from '../utils/api-cache';

export async function getM365Status(env: Env): Promise<Response> {
  try {
    const data = await withApiCache(
      env,
      'api:m365',
      30, // 30 second cache
      async () => {
        // Read from m365_current table instead of making external API calls
        const latestServices = await env.DB.prepare(`
          SELECT service_name, status, issues, checked_at
          FROM m365_current
          ORDER BY service_name
        `).all();

    if (!latestServices.success || !latestServices.results) {
      throw new Error('Failed to fetch M365 status from database');
    }

    // Parse database results into M365Service objects
    const services: M365Service[] = latestServices.results.map((row: any) => {
      let issues: M365Issue[] = [];
      try {
        issues = JSON.parse(row.issues || '[]');
      } catch (e) {
        console.error(`Error parsing issues for ${row.service_name}:`, e);
      }

      return {
        name: row.service_name,
        status: row.status as ServiceStatus,
        issues,
      };
    });

    // Calculate overall status from all services
    let overall: ServiceStatus = 'operational';
    const hasOutage = services.some(s => s.status === 'outage');
    const hasDegraded = services.some(s => s.status === 'degraded');

    if (hasOutage) {
      overall = 'outage';
    } else if (hasDegraded) {
      overall = 'degraded';
    } else if (services.length === 0) {
      overall = 'unknown';
    }

        // Get the most recent checked_at timestamp across all services
        const lastChecked = latestServices.results.length > 0
          ? latestServices.results.reduce((max, row: any) => {
              const checkedAt = row.checked_at as string;
              return checkedAt > max ? checkedAt : max;
            }, latestServices.results[0].checked_at as string)
          : new Date().toISOString();

        return {
          overall,
          services,
          lastChecked,
        };
      }
    );

    return new Response(JSON.stringify(data), {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=30',
      },
    });
  } catch (error) {
    console.error('Error fetching M365 status:', error);
    return new Response(JSON.stringify({
      error: 'Failed to fetch M365 status',
      message: error instanceof Error ? error.message : 'Unknown error',
      overall: 'unknown',
      services: [],
      lastChecked: new Date().toISOString(),
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
