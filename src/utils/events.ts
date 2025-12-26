/**
 * Event generation utilities with deduplication logic
 */

import type { Env, EventSeverity, AlertStateRow } from '../types';
import { createEvent } from '../db/queries';
import { DEGRADED_THRESHOLD_MINUTES } from '../config/events';

/**
 * Get the current alert state for an entity
 */
export async function getAlertState(
  env: Env,
  entityType: string,
  entityId: string
): Promise<{ last_status: string; last_checked: string } | null> {
  const result = await env.DB.prepare(
    'SELECT last_status, last_checked FROM alert_state WHERE entity_type = ? AND entity_id = ?'
  )
    .bind(entityType, entityId)
    .first<AlertStateRow>();

  if (!result) {return null;}

  return {
    last_status: result.last_status,
    last_checked: result.last_checked || new Date().toISOString(),
  };
}

/**
 * Update the alert state for an entity
 */
export async function updateAlertState(
  env: Env,
  entityType: string,
  entityId: string,
  status: string
): Promise<void> {
  const now = new Date().toISOString();

  await env.DB.prepare(
    `INSERT INTO alert_state (entity_type, entity_id, last_status, last_checked)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(entity_type, entity_id)
     DO UPDATE SET last_status = excluded.last_status, last_checked = excluded.last_checked`
  )
    .bind(entityType, entityId, status, now)
    .run();
}

/**
 * Check if enough time has passed for degraded state to be logged
 */
export function shouldLogDegraded(previousState: { last_status: string; last_checked: string } | null): boolean {
  if (!previousState || previousState.last_status !== 'degraded') {
    return false; // Just entered degraded, don't log yet
  }

  const degradedSince = new Date(previousState.last_checked);
  const now = new Date();
  const minutesInDegraded = (now.getTime() - degradedSince.getTime()) / 60000;

  return minutesInDegraded >= DEGRADED_THRESHOLD_MINUTES;
}

/**
 * Map status to severity level
 */
export function mapSeverity(status: string, eventType?: string): EventSeverity {
  // Resolved events are always info
  if (
    eventType === 'resolved' ||
    eventType === 'issue_resolved' ||
    eventType === 'incident_resolved'
  ) {
    return 'info';
  }

  // Outages and critical events
  if (
    status === 'outage' ||
    status === 'critical' ||
    eventType === 'connectivity_outage' ||
    eventType === 'bgp_incident'
  ) {
    return 'critical';
  }

  // Degraded and warning events
  if (status === 'degraded' || status === 'warning' || eventType === 'connectivity_degraded') {
    return 'warning';
  }

  // Default to info
  return 'info';
}

/**
 * Generate event title based on source and type
 */
export function generateEventTitle(
  source: string,
  eventType: string,
  entityName: string,
  metadata?: any
): string {
  // Service events
  if (source === 'service') {
    if (eventType === 'outage') {
      return `${entityName} is experiencing an outage`;
    } else if (eventType === 'degraded') {
      return `${entityName} is experiencing degraded performance`;
    } else if (eventType === 'resolved') {
      return `${entityName} has been restored`;
    }
  }

  // Cloud events
  if (source === 'cloud') {
    if (eventType === 'incident_started' && metadata?.title) {
      return `${entityName}: ${metadata.title}`;
    } else if (eventType === 'incident_resolved') {
      return `${entityName} incident resolved`;
    }
  }

  // M365 events
  if (source === 'm365') {
    if (eventType === 'service_issue' && metadata?.title) {
      return `M365 ${entityName}: ${metadata.title}`;
    } else if (eventType === 'issue_resolved') {
      return `M365 ${entityName} issue resolved`;
    }
  }

  // Workspace events
  if (source === 'gworkspace') {
    if (eventType === 'service_issue' && metadata?.title) {
      return `Workspace ${entityName}: ${metadata.title}`;
    } else if (eventType === 'issue_resolved') {
      return `Workspace ${entityName} issue resolved`;
    }
  }

  // ISP events
  if (source === 'isp') {
    if (eventType === 'connectivity_degraded') {
      return `${entityName}: Connectivity degraded`;
    } else if (eventType === 'connectivity_outage') {
      return `${entityName}: Connectivity outage`;
    } else if (eventType === 'bgp_incident') {
      return `${entityName}: BGP ${metadata?.incidentType || 'incident'} detected`;
    } else if (eventType === 'resolved') {
      return `${entityName}: Connectivity restored`;
    }
  }

  // Radar events
  if (source === 'radar') {
    if (eventType === 'ddos_spike_layer3' && metadata?.count) {
      return `DDoS Spike Detected: ${metadata.count} Layer 3 attacks`;
    } else if (eventType === 'ddos_spike_layer7' && metadata?.count) {
      return `DDoS Spike Detected: ${metadata.count} Layer 7 attacks`;
    }
  }

  // Fallback
  return `${entityName}: ${eventType}`;
}

/**
 * Create an event if the status has changed
 */
export async function createEventIfChanged(
  env: Env,
  params: {
    source: string;
    event_type: string;
    entityId: string;
    entityName: string;
    currentStatus: string;
    title?: string;
    description?: string;
    metadata?: any;
  }
): Promise<boolean> {
  const { source, event_type, entityId, entityName, currentStatus, title, description, metadata } = params;

  // Get previous state
  const previousState = await getAlertState(env, source, entityId);

  // Handle degraded state with threshold
  if (currentStatus === 'degraded') {
    if (!previousState || previousState.last_status !== 'degraded') {
      // Just entered degraded state - record timestamp, don't create event yet
      await updateAlertState(env, source, entityId, 'degraded');
      return false;
    } else {
      // Check if 5 minutes have passed
      if (!shouldLogDegraded(previousState)) {
        // Still within threshold, don't create event
        return false;
      }
      // Threshold passed, create event (will be created below)
    }
  }

  // Check if status has changed (skip if same status)
  if (previousState && previousState.last_status === currentStatus) {
    // Status hasn't changed, skip event creation
    return false;
  }

  // Check if this is a resolution event
  const isResolution =
    currentStatus === 'operational' &&
    previousState &&
    (previousState.last_status === 'degraded' || previousState.last_status === 'outage');

  // Don't create resolution event if previous status was unknown/operational
  if (currentStatus === 'operational' && !isResolution) {
    await updateAlertState(env, source, entityId, currentStatus);
    return false;
  }

  // Generate title if not provided
  const eventTitle = title || generateEventTitle(source, event_type, entityName, metadata);

  // Determine severity
  const severity = mapSeverity(currentStatus, event_type);

  // Create the event
  try {
    await createEvent(env, {
      source,
      event_type,
      severity,
      title: eventTitle,
      description,
      entity_id: entityId,
      entity_name: entityName,
      occurred_at: new Date().toISOString(),
    });

    // Update alert state
    await updateAlertState(env, source, entityId, currentStatus);

    console.log(`Created event: ${source}/${entityId} - ${eventTitle}`);
    return true;
  } catch (error) {
    console.error(`Failed to create event for ${source}/${entityId}:`, error);
    return false;
  }
}

/**
 * Simple hash function for incident tracking
 */
export function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(36);
}

/**
 * Hash an incident for tracking
 */
export function hashIncident(title: string, startTime: string): string {
  return simpleHash(`${title}-${startTime}`);
}
