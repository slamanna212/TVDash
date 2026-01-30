-- Fix malformed dates in events table
-- RFC 2822 dates like "Tue, 27 Jan 2026 09:00:00 Z" sort incorrectly
-- Convert them to ISO 8601 format "2026-01-27T09:00:00Z"

-- SQLite's datetime() function can parse RFC 2822 dates and output ISO format
-- Events with proper ISO dates (starting with "202" or "199") are left unchanged

UPDATE events
SET occurred_at = datetime(occurred_at)
WHERE occurred_at NOT LIKE '202%'
  AND occurred_at NOT LIKE '199%'
  AND occurred_at IS NOT NULL;

-- Also fix any cloud_status incidents that may have bad dates in their JSON
-- (The incidents column stores JSON, which we can't easily fix in SQL,
-- but future writes will use the corrected code)
