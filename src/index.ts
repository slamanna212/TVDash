import type { Env } from './types';
import { handleScheduled } from './scheduled';
import { handleApiRequest } from './api/routes';

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    // CORS headers for development
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      // Health check endpoint
      if (url.pathname === '/health') {
        return new Response(JSON.stringify({ status: 'ok', timestamp: new Date().toISOString() }), {
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders
          },
        });
      }

      // API routes
      if (url.pathname.startsWith('/api/')) {
        const response = await handleApiRequest(request, env);
        // Add CORS headers to API responses
        const headers = new Headers(response.headers);
        Object.entries(corsHeaders).forEach(([key, value]) => {
          headers.set(key, value);
        });
        return new Response(response.body, {
          status: response.status,
          statusText: response.statusText,
          headers,
        });
      }

      // Serve static frontend (will be handled by Workers Sites)
      // For now, return a simple message
      return new Response('MSP Dashboard - Frontend not yet deployed', {
        headers: { 'Content-Type': 'text/plain', ...corsHeaders },
      });
    } catch (error) {
      console.error('Error handling request:', error);
      return new Response(JSON.stringify({
        error: 'Internal Server Error',
        message: error instanceof Error ? error.message : 'Unknown error'
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }
  },

  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    await handleScheduled(event, env, ctx);
  },
};
