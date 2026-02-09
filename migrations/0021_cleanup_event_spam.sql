-- Remove stale M365 alert_state entries with dash format (bug: should have used colon)
DELETE FROM alert_state WHERE entity_type = 'm365-issue' AND entity_id NOT LIKE '%:%';

-- Remove old cloud-incident alert_state (will be re-detected with new provider-scoped format)
DELETE FROM alert_state WHERE entity_type = 'cloud-incident';

-- Delete all M365 resolved spam events
DELETE FROM events WHERE source = 'm365' AND event_type = 'issue_resolved';

-- Delete duplicate degraded events (keep first per entity per day)
DELETE FROM events WHERE event_type = 'degraded' AND id NOT IN (
  SELECT MIN(id) FROM events WHERE event_type = 'degraded' GROUP BY source, entity_id, date(occurred_at)
);

-- Backfill resolved_at on events that have a matching resolution event
UPDATE events SET resolved_at = (
  SELECT MIN(e2.occurred_at) FROM events e2
  WHERE e2.source = events.source AND e2.entity_id = events.entity_id
    AND e2.event_type IN ('resolved', 'issue_resolved', 'incident_resolved')
    AND e2.occurred_at > events.occurred_at
) WHERE resolved_at IS NULL
  AND event_type NOT IN ('resolved', 'issue_resolved', 'incident_resolved');
