import type { Env, Service, ServiceWithStatus, ServiceStatus } from '../types';

export async function getServices(env: Env): Promise<Response> {
  try {
    // Get all services
    const servicesResult = await env.DB.prepare(`
      SELECT * FROM services ORDER BY display_order
    `).all();

    if (!servicesResult.success) {
      throw new Error('Failed to fetch services');
    }

    const services = servicesResult.results as Service[];

    // Get latest status for each service
    const servicesWithStatus: ServiceWithStatus[] = await Promise.all(
      services.map(async (service) => {
        const statusResult = await env.DB.prepare(`
          SELECT status, response_time_ms, message, checked_at
          FROM status_history
          WHERE service_id = ?
          ORDER BY checked_at DESC
          LIMIT 1
        `).bind(service.id).first();

        return {
          ...service,
          status: (statusResult?.status as ServiceStatus) || 'unknown',
          statusText: statusResult?.message as string || 'Not yet checked',
          responseTime: statusResult?.response_time_ms as number || undefined,
          lastChecked: statusResult?.checked_at as string || new Date().toISOString(),
        };
      })
    );

    // Calculate summary
    const summary = {
      total: servicesWithStatus.length,
      operational: servicesWithStatus.filter(s => s.status === 'operational').length,
      degraded: servicesWithStatus.filter(s => s.status === 'degraded').length,
      outage: servicesWithStatus.filter(s => s.status === 'outage').length,
      unknown: servicesWithStatus.filter(s => s.status === 'unknown').length,
    };

    return new Response(JSON.stringify({
      services: servicesWithStatus,
      summary,
      lastUpdated: new Date().toISOString(),
    }), {
      headers: { 'Content-Type': 'application/json' },
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
