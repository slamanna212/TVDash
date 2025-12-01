import type { Env, ServiceStatus } from '../types';

/**
 * Health relay endpoint - receives health check results from GitHub Actions
 * POST /api/health-relay
 *
 * This endpoint allows GitHub Actions (running in US-based Azure datacenters)
 * to relay health check results for geo-restricted internal services.
 *
 * Security: HMAC-SHA256 signature verification prevents unauthorized updates
 */
export async function handleHealthRelay(request: Request, env: Env): Promise<Response> {
  // 1. Verify request method
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    // 2. Verify signature
    const signature = request.headers.get('X-Relay-Signature');
    if (!signature) {
      return new Response(JSON.stringify({ error: 'Missing signature' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const body = await request.text();

    // Verify HMAC signature
    const isValid = await verifySignature(body, signature, env.HEALTH_RELAY_SECRET);
    if (!isValid) {
      console.error('Invalid signature for health relay request');
      return new Response(JSON.stringify({ error: 'Invalid signature' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 3. Parse payload
    const payload = JSON.parse(body);
    if (!payload.checks || !Array.isArray(payload.checks)) {
      return new Response(JSON.stringify({ error: 'Invalid payload format' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 4. Process each check result
    const results = [];
    for (const check of payload.checks) {
      const result = await processHealthCheck(env, check);
      results.push(result);
    }

    // 5. Return success
    return new Response(JSON.stringify({
      status: 'ok',
      processed: results.length,
      results,
      timestamp: new Date().toISOString(),
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in health relay:', error);
    return new Response(JSON.stringify({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

/**
 * Verify HMAC-SHA256 signature
 * Uses constant-time comparison to prevent timing attacks
 */
async function verifySignature(body: string, signature: string, secret: string): Promise<boolean> {
  if (!secret) {
    console.error('HEALTH_RELAY_SECRET not configured');
    return false;
  }

  // Extract hash from "sha256=<hash>" format
  const [algorithm, hash] = signature.split('=');
  if (algorithm !== 'sha256' || !hash) {
    return false;
  }

  // Compute expected signature
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signatureBuffer = await crypto.subtle.sign('HMAC', key, encoder.encode(body));
  const expectedHash = Array.from(new Uint8Array(signatureBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');

  // Constant-time comparison
  return hash === expectedHash;
}

/**
 * Process a single health check result and write to database
 */
async function processHealthCheck(
  env: Env,
  check: {
    service_id: number;
    service_name: string;
    http_code: string;
    response_time: number;
    timestamp: string;
  }
): Promise<{ service_id: number; status: ServiceStatus; message: string }> {
  // Determine status from HTTP code
  const httpCode = parseInt(check.http_code || '0');
  let status: ServiceStatus;
  let message: string;

  if (httpCode === 0) {
    status = 'outage';
    message = 'Connection failed (timeout or network error)';
  } else if (httpCode >= 200 && httpCode < 300) {
    status = 'operational';
    message = `HTTP ${httpCode} - ${check.response_time}ms`;
  } else if (httpCode >= 500) {
    status = 'outage';
    message = `HTTP ${httpCode} - Server Error`;
  } else if (httpCode >= 400) {
    status = 'degraded';
    message = `HTTP ${httpCode} - Client Error`;
  } else {
    status = 'degraded';
    message = `HTTP ${httpCode}`;
  }

  // Write to status_history table
  try {
    await env.DB.prepare(`
      INSERT INTO status_history (service_id, status, response_time_ms, message, checked_at)
      VALUES (?, ?, ?, ?, ?)
    `).bind(
      check.service_id,
      status,
      check.response_time || null,
      message,
      check.timestamp
    ).run();

    console.log(`✓ GitHub Relay: ${check.service_name} = ${status} (${httpCode})`);

    return {
      service_id: check.service_id,
      status,
      message,
    };
  } catch (error) {
    console.error(`Failed to record status for service ${check.service_id}:`, error);
    throw error;
  }
}
