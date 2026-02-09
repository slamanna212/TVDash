-- Delete ALL m365 events (they're all spam at this point)
DELETE FROM events WHERE source = 'm365';

-- Delete all m365-issue alert_state entries so tracking starts fresh
DELETE FROM alert_state WHERE entity_type = 'm365-issue';
