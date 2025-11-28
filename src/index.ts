import type { Env } from './types';
import { handleScheduled } from './scheduled';
import { handleApiRequest } from './api/routes';
import { getAssetFromKV } from '@cloudflare/kv-asset-handler';

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

      // Manual trigger for scheduled tasks (development only)
      if (url.pathname === '/api/trigger-scheduled') {
        const cronParam = url.searchParams.get('cron') || '* * * * *';
        console.log(`Manually triggering scheduled task with cron: ${cronParam}`);

        // Create a mock ScheduledEvent
        const mockEvent: ScheduledEvent = {
          cron: cronParam,
          scheduledTime: Date.now(),
          type: 'scheduled',
        };

        // Run the scheduled handler
        ctx.waitUntil(handleScheduled(mockEvent, env, ctx));

        return new Response(JSON.stringify({
          status: 'triggered',
          cron: cronParam,
          message: `Scheduled task triggered with cron: ${cronParam}`
        }), {
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
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

      // Serve static frontend from Workers Sites
      try {
        return await getAssetFromKV(
          {
            request,
            waitUntil: ctx.waitUntil.bind(ctx),
          } as any,
          {
            ASSET_NAMESPACE: (env as any).__STATIC_CONTENT,
            ASSET_MANIFEST: (env as any).__STATIC_CONTENT_MANIFEST,
          }
        );
      } catch (e) {
        // If asset not found, serve index.html for client-side routing
        const notFoundResponse = await getAssetFromKV(
          {
            request: new Request(`${url.origin}/index.html`, request),
            waitUntil: ctx.waitUntil.bind(ctx),
          } as any,
          {
            ASSET_NAMESPACE: (env as any).__STATIC_CONTENT,
            ASSET_MANIFEST: (env as any).__STATIC_CONTENT_MANIFEST,
          }
        );
        return new Response(notFoundResponse.body, {
          ...notFoundResponse,
          status: 200,
        });
      }
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
