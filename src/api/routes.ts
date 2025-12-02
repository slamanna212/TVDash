import type { Env } from '../types';
import { getServices } from './services';
import { getCloudStatus } from './cloud';
import { getM365Status } from './m365';
import { getInternetStatus } from './internet';
import { getRadarAttacks } from './radar';
import { getEvents } from './events';
import { getServiceHistory } from '../db/queries';
import { getGridStatus } from './grid';
import { handleHealthRelay } from './health-relay';
import { handleSSEStream } from './sse';

export async function handleApiRequest(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const path = url.pathname;

  try {
    // GET /api/services - All services with current status
    if (path === '/api/services' && request.method === 'GET') {
      return await getServices(env);
    }

    // GET /api/services/:id/history - Historical data for a service
    if (path.match(/^\/api\/services\/\d+\/history$/) && request.method === 'GET') {
      const id = parseInt(path.split('/')[3]);
      const days = parseInt(url.searchParams.get('days') || '7');

      try {
        const history = await getServiceHistory(env, id, days);

        return new Response(JSON.stringify({
          serviceId: id,
          days,
          history,
          count: history.length,
        }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      } catch (error) {
        console.error(`Error fetching history for service ${id}:`, error);
        return new Response(JSON.stringify({
          error: 'Failed to fetch service history',
          message: error instanceof Error ? error.message : 'Unknown error',
        }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        });
      }
    }

    // GET /api/internet - ISP status + global internet health
    if (path === '/api/internet' && request.method === 'GET') {
      return await getInternetStatus(env);
    }

    // GET /api/cloud - Combined cloud status
    if (path === '/api/cloud' && request.method === 'GET') {
      return await getCloudStatus(env);
    }

    // GET /api/m365 - Microsoft 365 status
    if (path === '/api/m365' && request.method === 'GET') {
      return await getM365Status(env);
    }

    // GET /api/radar/attacks - Attack activity data
    if (path === '/api/radar/attacks' && request.method === 'GET') {
      return await getRadarAttacks(env);
    }

    // GET /api/grid - Power grid status
    if (path === '/api/grid' && request.method === 'GET') {
      return await getGridStatus(env);
    }

    // GET /api/events - Unified event timeline
    if (path === '/api/events' && request.method === 'GET') {
      return await getEvents(env, request);
    }

    // POST /api/health-relay - Receive health checks from GitHub Actions
    if (path === '/api/health-relay' && request.method === 'POST') {
      return await handleHealthRelay(request, env);
    }

    // GET /api/stream - Server-Sent Events for real-time updates
    if (path === '/api/stream' && request.method === 'GET') {
      return await handleSSEStream(request, env);
    }

    // 404 - Route not found
    return new Response(JSON.stringify({ error: 'Not Found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('API Error:', error);
    return new Response(JSON.stringify({
      error: 'Internal Server Error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
