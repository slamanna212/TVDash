import type { Env } from '../types';

export interface SSEChange {
  type: 'services' | 'cloud' | 'm365' | 'internet' | 'radar' | 'ransomware';
  data: { updated: boolean; timestamp: string };
}

/**
 * Check D1 database for changes since the last check
 */
async function checkForChanges(env: Env, since: string): Promise<SSEChange[]> {
  const changes: SSEChange[] = [];

  try {
    // Check for service status updates
    const servicesCheck = await env.DB.prepare(
      'SELECT MAX(checked_at) as last_update FROM status_history WHERE checked_at > ?'
    )
      .bind(since)
      .first<{ last_update: string | null }>();

    if (servicesCheck?.last_update) {
      changes.push({
        type: 'services',
        data: { updated: true, timestamp: servicesCheck.last_update },
      });
    }

    // Check for cloud status updates
    const cloudCheck = await env.DB.prepare(
      'SELECT MAX(checked_at) as last_update FROM cloud_status WHERE checked_at > ?'
    )
      .bind(since)
      .first<{ last_update: string | null }>();

    if (cloudCheck?.last_update) {
      changes.push({
        type: 'cloud',
        data: { updated: true, timestamp: cloudCheck.last_update },
      });
    }

    // Check for M365 health updates
    const m365Check = await env.DB.prepare(
      'SELECT MAX(checked_at) as last_update FROM m365_health WHERE checked_at > ?'
    )
      .bind(since)
      .first<{ last_update: string | null }>();

    if (m365Check?.last_update) {
      changes.push({
        type: 'm365',
        data: { updated: true, timestamp: m365Check.last_update },
      });
    }

    // Check for ISP updates
    const ispCheck = await env.DB.prepare(
      'SELECT MAX(checked_at) as last_update FROM isp_check_history WHERE checked_at > ?'
    )
      .bind(since)
      .first<{ last_update: string | null }>();

    if (ispCheck?.last_update) {
      changes.push({
        type: 'internet',
        data: { updated: true, timestamp: ispCheck.last_update },
      });
    }

    // Check for ransomware updates
    const ransomwareCheck = await env.DB.prepare(
      'SELECT MAX(checked_at) as last_update FROM ransomware_stats WHERE checked_at > ?'
    )
      .bind(since)
      .first<{ last_update: string | null }>();

    if (ransomwareCheck?.last_update) {
      changes.push({
        type: 'ransomware',
        data: { updated: true, timestamp: ransomwareCheck.last_update },
      });
    }

    // Note: Radar data doesn't have a persistent table yet, so we'll trigger updates
    // when services are updated (as a proxy for "new data available")

  } catch (error) {
    console.error('Error checking for changes:', error);
  }

  return changes;
}

/**
 * Handle SSE stream endpoint
 * Polls D1 every 10 seconds for changes and sends events to client
 */
export async function handleSSEStream(request: Request, env: Env): Promise<Response> {
  // Verify client accepts SSE
  const accept = request.headers.get('Accept');
  if (!accept?.includes('text/event-stream')) {
    return new Response('SSE not supported by client', {
      status: 406,
      headers: { 'Content-Type': 'text/plain' },
    });
  }

  const encoder = new TextEncoder();
  let intervalId: number | undefined;
  let lastCheck = new Date().toISOString();

  const stream = new ReadableStream({
    async start(controller) {
      try {
        // Send initial connection event
        const connectMessage = `event: connected\ndata: ${JSON.stringify({
          timestamp: new Date().toISOString(),
          message: 'SSE connection established',
        })}\n\n`;
        controller.enqueue(encoder.encode(connectMessage));

        // Poll for changes every 10 seconds
        intervalId = setInterval(async () => {
          try {
            // Check for data changes
            const changes = await checkForChanges(env, lastCheck);

            if (changes.length > 0) {
              // Send each change as a separate event
              for (const change of changes) {
                const eventMessage = `event: ${change.type}\ndata: ${JSON.stringify(change.data)}\n\n`;
                controller.enqueue(encoder.encode(eventMessage));
              }
              // Update lastCheck to the latest timestamp
              const latestTimestamp = changes.reduce((latest, change) => {
                return change.data.timestamp > latest ? change.data.timestamp : latest;
              }, lastCheck);
              lastCheck = latestTimestamp;
            }

            // Send heartbeat to keep connection alive
            controller.enqueue(encoder.encode(': heartbeat\n\n'));
          } catch (error) {
            console.error('Error in SSE poll interval:', error);
            // Don't close connection on error, just log it
          }
        }, 10000) as unknown as number;

      } catch (error) {
        console.error('Error starting SSE stream:', error);
        controller.error(error);
      }
    },

    cancel() {
      // Cleanup when client disconnects
      if (intervalId !== undefined) {
        clearInterval(intervalId);
      }
      console.log('SSE connection closed by client');
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'X-Accel-Buffering': 'no', // Disable buffering in nginx/proxies
    },
  });
}
