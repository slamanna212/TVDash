/**
 * Events API handler
 */

import type { Env } from '../types';

export async function getEvents(env: Env, request: Request): Promise<Response> {
  try {
    const url = new URL(request.url);

    // Query parameters
    const source = url.searchParams.get('source'); // Filter by source
    const severity = url.searchParams.get('severity'); // Filter by severity
    const limit = parseInt(url.searchParams.get('limit') || '100');
    const offset = parseInt(url.searchParams.get('offset') || '0');
    const resolved = url.searchParams.get('resolved'); // 'true', 'false', or null (all)

    // Build WHERE clause
    const conditions: string[] = [];
    const bindings: any[] = [];

    if (source) {
      conditions.push('source = ?');
      bindings.push(source);
    }

    if (severity) {
      conditions.push('severity = ?');
      bindings.push(severity);
    }

    if (resolved === 'true') {
      conditions.push('resolved_at IS NOT NULL');
    } else if (resolved === 'false') {
      conditions.push('resolved_at IS NULL');
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Fetch events
    const query = `
      SELECT *
      FROM events
      ${whereClause}
      ORDER BY occurred_at DESC
      LIMIT ? OFFSET ?
    `;

    const stmt = env.DB.prepare(query);
    const result = await stmt.bind(...bindings, limit, offset).all();

    if (!result.success) {
      throw new Error('Failed to fetch events');
    }

    // Get total count
    const countQuery = `
      SELECT COUNT(*) as total
      FROM events
      ${whereClause}
    `;

    const countStmt = env.DB.prepare(countQuery);
    const countResult = await countStmt.bind(...bindings).first();
    const total = (countResult as any)?.total || 0;

    // Get summary stats
    const summary = await getEventsSummary(env);

    return new Response(
      JSON.stringify({
        events: result.results,
        total,
        limit,
        offset,
        summary,
        lastUpdated: new Date().toISOString(),
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error fetching events:', error);
    return new Response(
      JSON.stringify({
        error: 'Failed to fetch events',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}

async function getEventsSummary(env: Env): Promise<any> {
  // Get counts by severity (last 7 days)
  const severityResult = await env.DB.prepare(`
    SELECT severity, COUNT(*) as count
    FROM events
    WHERE occurred_at > datetime('now', '-7 days')
    GROUP BY severity
  `).all();

  // Get counts by source (last 7 days)
  const sourceResult = await env.DB.prepare(`
    SELECT source, COUNT(*) as count
    FROM events
    WHERE occurred_at > datetime('now', '-7 days')
    GROUP BY source
  `).all();

  // Active (unresolved) events
  const activeResult = await env.DB.prepare(`
    SELECT COUNT(*) as count
    FROM events
    WHERE resolved_at IS NULL
  `).first();

  return {
    bySeverity: severityResult.results || [],
    bySource: sourceResult.results || [],
    activeCount: (activeResult as any)?.count || 0,
  };
}
