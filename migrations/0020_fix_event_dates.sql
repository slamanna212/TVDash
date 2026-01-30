-- Fix malformed dates in events table
-- RFC 2822 dates like "Tue, 27 Jan 2026 09:00:00 Z" sort incorrectly
-- SQLite cannot parse RFC 2822, so we delete these events
-- They will be recreated with proper ISO 8601 dates on the next collector run

-- Delete events with malformed dates (those not starting with a year)
DELETE FROM events
WHERE occurred_at NOT LIKE '202%'
  AND occurred_at NOT LIKE '199%'
  AND occurred_at IS NOT NULL;
