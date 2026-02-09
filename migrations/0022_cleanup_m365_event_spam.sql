-- Delete duplicate M365 events (keep first occurrence per entity_id + event_type)
DELETE FROM events
WHERE source = 'm365'
  AND id NOT IN (
    SELECT MIN(id) FROM events WHERE source = 'm365' GROUP BY entity_id, event_type
  );
