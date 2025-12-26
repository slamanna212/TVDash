-- Migration: Add index for events.entity_id
-- Date: 2025-12-26
-- Purpose: Improve query performance for event lookups by entity_id
--
-- The entity_id column is frequently used in WHERE clauses to:
-- - Look up events for specific services, ISPs, or cloud incidents
-- - Check for existing events before creating new ones
-- - Filter events by entity in the events timeline
--
-- This index will significantly speed up these queries, especially as
-- the events table grows over time.

CREATE INDEX IF NOT EXISTS idx_events_entity_id ON events(entity_id);

-- Composite index for common query pattern: filtering by entity_id and ordering by occurred_at
CREATE INDEX IF NOT EXISTS idx_events_entity_occurred ON events(entity_id, occurred_at DESC);
