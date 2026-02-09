/**
 * Events API handler
 */

import type {
  Env,
  Event,
  CountRow,
  SeverityCountRow,
  SourceCountRow,
} from '../types';
import { MAX_LIMIT, VALID_SEVERITIES, VALID_EVENT_SOURCES } from '../types';

interface EventsSummary {
  bySeverity: SeverityCountRow[];
  bySource: SourceCountRow[];
  activeCount: number;
}

export async function getEvents(env: Env, request: Request): Promise<Response> {
  try {
    const url = new URL(request.url);

    // Query parameters with validation
    const source = url.searchParams.get('source');
    const severity = url.searchParams.get('severity');
    const entity_name = url.searchParams.get('entity_name');
    const rawLimit = parseInt(url.searchParams.get('limit') || '100', 10);
    const rawOffset = parseInt(url.searchParams.get('offset') || '0', 10);
    const resolved = url.searchParams.get('resolved');

    // Validate limit
    const limit = Math.min(Math.max(1, isNaN(rawLimit) ? 100 : rawLimit), MAX_LIMIT);

    // Validate offset (must be non-negative)
    const offset = Math.max(0, isNaN(rawOffset) ? 0 : rawOffset);

    // Validate severity if provided
    if (severity && !VALID_SEVERITIES.includes(severity as typeof VALID_SEVERITIES[number])) {
      return new Response(
        JSON.stringify({
          error: 'Invalid severity',
          message: `Severity must be one of: ${VALID_SEVERITIES.join(', ')}`,
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Validate source if provided
    if (source && !VALID_EVENT_SOURCES.includes(source as typeof VALID_EVENT_SOURCES[number])) {
      return new Response(
        JSON.stringify({
          error: 'Invalid source',
          message: `Source must be one of: ${VALID_EVENT_SOURCES.join(', ')}`,
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Build WHERE clause
    const conditions: string[] = [];
    const bindings: (string | number)[] = [];

    if (source) {
      conditions.push('source = ?');
      bindings.push(source);
    }

    if (severity) {
      conditions.push('severity = ?');
      bindings.push(severity);
    }

    if (entity_name) {
      conditions.push('entity_name = ?');
      bindings.push(entity_name);
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
    const countResult = await countStmt.bind(...bindings).first<CountRow>();
    const total = countResult?.total ?? 0;

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

async function getEventsSummary(env: Env): Promise<EventsSummary> {
  // Get counts by severity (last 7 days)
  const severityResult = await env.DB.prepare(`
    SELECT severity, COUNT(*) as count
    FROM events
    WHERE occurred_at > datetime('now', '-7 days')
    GROUP BY severity
  `).all<SeverityCountRow>();

  // Get counts by source (last 7 days)
  const sourceResult = await env.DB.prepare(`
    SELECT source, COUNT(*) as count
    FROM events
    WHERE occurred_at > datetime('now', '-7 days')
    GROUP BY source
  `).all<SourceCountRow>();

  // Active (unresolved) events
  const activeResult = await env.DB.prepare(`
    SELECT COUNT(*) as count
    FROM events
    WHERE resolved_at IS NULL
  `).first<CountRow>();

  return {
    bySeverity: severityResult.results || [],
    bySource: sourceResult.results || [],
    activeCount: activeResult?.count ?? 0,
  };
}
