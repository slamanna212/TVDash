import type { Env, Service, ServiceWithStatus, ServiceStatus } from '../types';
import { withApiCache } from '../utils/api-cache';

export async function getServices(env: Env): Promise<Response> {
  try {
    const data = await withApiCache(
      env,
      'api:services',
      30, // 30 second cache
      async () => {
        // Single query with JOIN and window function to avoid N+1 pattern
        // Uses ROW_NUMBER() to get latest status for each service efficiently
        const result = await env.DB.prepare(`
      SELECT
        s.id,
        s.name,
        s.category,
        s.check_type,
        s.check_url,
        s.statuspage_id,
        s.supports_warning,
        s.display_order,
        s.created_at,
        COALESCE(sh.status, 'unknown') as status,
        sh.response_time_ms,
        COALESCE(sh.message, 'Not yet checked') as message,
        COALESCE(sh.checked_at, datetime('now')) as checked_at
      FROM services s
      LEFT JOIN (
        SELECT
          service_id,
          status,
          response_time_ms,
          message,
          checked_at,
          ROW_NUMBER() OVER (PARTITION BY service_id ORDER BY checked_at DESC) as rn
        FROM status_history
      ) sh ON s.id = sh.service_id AND sh.rn = 1
      ORDER BY s.display_order
    `).all();

    if (!result.success) {
      throw new Error('Failed to fetch services');
    }

    const servicesWithStatus: ServiceWithStatus[] = result.results.map((row: any) => ({
      id: row.id,
      name: row.name,
      category: row.category,
      check_type: row.check_type,
      check_url: row.check_url,
      statuspage_id: row.statuspage_id,
      supports_warning: row.supports_warning,
      display_order: row.display_order,
      created_at: row.created_at,
      status: row.status as ServiceStatus,
      statusText: row.message,
      responseTime: row.response_time_ms || undefined,
      lastChecked: row.checked_at,
    }));

        // Calculate summary
        const summary = {
          total: servicesWithStatus.length,
          operational: servicesWithStatus.filter(s => s.status === 'operational').length,
          degraded: servicesWithStatus.filter(s => s.status === 'degraded').length,
          outage: servicesWithStatus.filter(s => s.status === 'outage').length,
          unknown: servicesWithStatus.filter(s => s.status === 'unknown').length,
        };

        return {
          services: servicesWithStatus,
          summary,
          lastUpdated: new Date().toISOString(),
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
    console.error('Error fetching services:', error);
    return new Response(JSON.stringify({
      error: 'Failed to fetch services',
      message: error instanceof Error ? error.message : 'Unknown error',
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
