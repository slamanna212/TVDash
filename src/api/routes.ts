import type { Env } from '../types';
import { getServices } from './services';
import { getCloudStatus } from './cloud';
import { getM365Status } from './m365';
import { getGWorkspaceStatus } from './gworkspace';

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
      // TODO: Implement service history endpoint
      return new Response(JSON.stringify({ error: 'Not implemented yet' }), {
        status: 501,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // GET /api/internet - ISP status + global internet health
    if (path === '/api/internet' && request.method === 'GET') {
      // TODO: Implement internet status endpoint
      return new Response(JSON.stringify({ error: 'Not implemented yet' }), {
        status: 501,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // GET /api/cloud - Combined cloud status
    if (path === '/api/cloud' && request.method === 'GET') {
      return await getCloudStatus(env);
    }

    // GET /api/m365 - Microsoft 365 status
    if (path === '/api/m365' && request.method === 'GET') {
      return await getM365Status(env);
    }

    // GET /api/gworkspace - Google Workspace status
    if (path === '/api/gworkspace' && request.method === 'GET') {
      return await getGWorkspaceStatus(env);
    }

    // GET /api/radar/attacks - Attack activity data
    if (path === '/api/radar/attacks' && request.method === 'GET') {
      // TODO: Implement Radar attacks endpoint
      return new Response(JSON.stringify({ error: 'Not implemented yet' }), {
        status: 501,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // GET /api/grid - Power grid status
    if (path === '/api/grid' && request.method === 'GET') {
      // TODO: Implement grid status endpoint
      return new Response(JSON.stringify({ error: 'Not implemented yet' }), {
        status: 501,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // GET /api/events - Unified event timeline
    if (path === '/api/events' && request.method === 'GET') {
      // TODO: Implement events timeline endpoint
      return new Response(JSON.stringify({ error: 'Not implemented yet' }), {
        status: 501,
        headers: { 'Content-Type': 'application/json' },
      });
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
