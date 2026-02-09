import type {
  Env,
  Service,
  LocalISP,
  Event,
  StatusHistoryRow,
  CloudStatusRow,
  M365HealthRow,
  WorkspaceStatusRow,
  AlertStateRow,
  EntityIdRow,
} from '../types';

/**
 * Database query helpers for common operations
 */

/**
 * Get all services
 */
export async function getAllServices(env: Env): Promise<Service[]> {
  const result = await env.DB.prepare('SELECT * FROM services ORDER BY display_order').all();

  if (!result.success) {
    throw new Error('Failed to fetch services');
  }

  return (result.results as Service[]) || [];
}

/**
 * Get a single service by ID
 */
export async function getServiceById(env: Env, id: number): Promise<Service | null> {
  const result = await env.DB.prepare('SELECT * FROM services WHERE id = ?').bind(id).first();

  return result as Service | null;
}

/**
 * Get latest status for a service
 */
export async function getLatestServiceStatus(
  env: Env,
  serviceId: number
): Promise<StatusHistoryRow | null> {
  const result = await env.DB.prepare(`
    SELECT status, response_time_ms, message, checked_at
    FROM status_history
    WHERE service_id = ?
    ORDER BY checked_at DESC
    LIMIT 1
  `).bind(serviceId).first<StatusHistoryRow>();

  return result;
}

/**
 * Get status history for a service
 */
export async function getServiceHistory(
  env: Env,
  serviceId: number,
  days: number = 7
): Promise<StatusHistoryRow[]> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);

  const result = await env.DB.prepare(`
    SELECT status, response_time_ms, checked_at
    FROM status_history
    WHERE service_id = ? AND checked_at > ?
    ORDER BY checked_at ASC
  `).bind(serviceId, cutoffDate.toISOString()).all<StatusHistoryRow>();

  if (!result.success) {
    return [];
  }

  return result.results;
}

/**
 * Get all local ISPs
 */
export async function getAllISPs(env: Env): Promise<LocalISP[]> {
  const result = await env.DB.prepare('SELECT * FROM local_isps ORDER BY display_order').all();

  if (!result.success) {
    return [];
  }

  return result.results as LocalISP[];
}

/**
 * Get latest cloud status for all providers
 */
export async function getLatestCloudStatus(env: Env): Promise<CloudStatusRow[]> {
  // Get the most recent status for each provider
  const result = await env.DB.prepare(`
    SELECT provider, overall_status, incidents, last_updated
    FROM cloud_status
    WHERE (provider, checked_at) IN (
      SELECT provider, MAX(checked_at)
      FROM cloud_status
      GROUP BY provider
    )
  `).all<CloudStatusRow>();

  if (!result.success) {
    return [];
  }

  return result.results;
}

/**
 * Get latest M365 health for all services
 */
export async function getLatestM365Health(env: Env): Promise<M365HealthRow[]> {
  const result = await env.DB.prepare(`
    SELECT service_name, status, issues, last_changed, checked_at
    FROM m365_current
  `).all<M365HealthRow>();

  if (!result.success) {
    return [];
  }

  return result.results;
}

/**
 * Get latest Google Workspace status
 */
export async function getLatestWorkspaceStatus(env: Env): Promise<WorkspaceStatusRow | null> {
  const result = await env.DB.prepare(`
    SELECT overall_status, incidents
    FROM gworkspace_status
    ORDER BY checked_at DESC
    LIMIT 1
  `).first<WorkspaceStatusRow>();

  return result;
}

/**
 * Create an event
 */
export async function createEvent(
  env: Env,
  event: {
    source: string;
    event_type: string;
    severity: string;
    title: string;
    description?: string;
    entity_id?: string;
    entity_name?: string;
    occurred_at: string;
    expires_at?: string;
  }
): Promise<void> {
  await env.DB.prepare(`
    INSERT INTO events (source, event_type, severity, title, description, entity_id, entity_name, occurred_at, expires_at, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)
    .bind(
      event.source,
      event.event_type,
      event.severity,
      event.title,
      event.description || null,
      event.entity_id || null,
      event.entity_name || null,
      event.occurred_at,
      event.expires_at || null,
      new Date().toISOString()
    )
    .run();
}

/**
 * Get recent events
 */
export async function getRecentEvents(
  env: Env,
  limit: number = 50,
  source?: string
): Promise<Event[]> {
  const query = `
    SELECT *
    FROM events
    ${source ? 'WHERE source = ?' : ''}
    ORDER BY occurred_at DESC
    LIMIT ?
  `;

  const stmt = env.DB.prepare(query);

  const result = source
    ? await stmt.bind(source, limit).all<Event>()
    : await stmt.bind(limit).all<Event>();

  if (!result.success) {
    return [];
  }

  return result.results;
}

/**
 * Get or create alert state
 */
export async function getAlertState(
  env: Env,
  entityType: string,
  entityId: string
): Promise<AlertStateRow | null> {
  const result = await env.DB.prepare(`
    SELECT last_status
    FROM alert_state
    WHERE entity_type = ? AND entity_id = ?
  `).bind(entityType, entityId).first<AlertStateRow>();

  return result;
}

/**
 * Update alert state
 */
export async function updateAlertState(
  env: Env,
  entityType: string,
  entityId: string,
  newStatus: string
): Promise<void> {
  await env.DB.prepare(`
    INSERT INTO alert_state (entity_type, entity_id, last_status, last_checked)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(entity_type, entity_id) DO UPDATE SET
      last_status = excluded.last_status,
      last_checked = excluded.last_checked
  `)
    .bind(entityType, entityId, newStatus, new Date().toISOString())
    .run();
}

/**
 * Check if an event already exists for a specific entity
 */
export async function checkEventExists(
  env: Env,
  source: string,
  entityId: string
): Promise<boolean> {
  const result = await env.DB.prepare(`
    SELECT id FROM events
    WHERE source = ? AND entity_id = ?
    ORDER BY created_at DESC
    LIMIT 1
  `)
    .bind(source, entityId)
    .first();

  return result !== null;
}

/**
 * Get previous cloud incidents for a provider (from alert_state)
 */
export async function getPreviousCloudIncidents(
  env: Env,
  provider: string
): Promise<Set<string>> {
  const result = await env.DB.prepare(`
    SELECT entity_id
    FROM alert_state
    WHERE entity_type = ?
  `)
    .bind(`cloud-incident-${provider.toLowerCase()}`)
    .all<EntityIdRow>();

  if (!result.success) {return new Set();}

  return new Set(result.results.map((r) => r.entity_id));
}

/**
 * Get previous M365 issues for a service (from alert_state)
 */
export async function getPreviousM365Issues(
  env: Env,
  serviceName: string
): Promise<Set<string>> {
  const result = await env.DB.prepare(`
    SELECT entity_id
    FROM alert_state
    WHERE entity_type = 'm365-issue'
      AND entity_id LIKE ?
  `)
    .bind(`${serviceName}:%`)
    .all<EntityIdRow>();

  if (!result.success) {return new Set();}

  return new Set(
    result.results.map((r) => {
      // Extract issue ID from entity_id format: "ServiceName:IssueID"
      // Using ':' delimiter since it can't appear in service names
      const colonIndex = r.entity_id.indexOf(':');
      return colonIndex >= 0 ? r.entity_id.substring(colonIndex + 1) : r.entity_id;
    })
  );
}

/**
 * Mark event as resolved
 */
export async function markEventResolved(
  env: Env,
  source: string,
  entityId: string
): Promise<void> {
  await env.DB.prepare(`
    UPDATE events
    SET resolved_at = ?
    WHERE source = ?
      AND entity_id = ?
      AND resolved_at IS NULL
  `)
    .bind(new Date().toISOString(), source, entityId)
    .run();
}

/**
 * Record status history (wrapper for insert)
 */
export async function recordStatusHistory(
  env: Env,
  serviceId: number,
  status: string,
  responseTimeMs: number | null,
  message: string | null
): Promise<void> {
  await env.DB.prepare(`
    INSERT INTO status_history (service_id, status, response_time_ms, message, checked_at)
    VALUES (?, ?, ?, ?, ?)
  `)
    .bind(serviceId, status, responseTimeMs, message, new Date().toISOString())
    .run();
}
