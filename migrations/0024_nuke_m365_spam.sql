-- Clean up M365 event spam (0023 ran before the code fix, so spam continued)
DELETE FROM events WHERE source = 'm365';

-- Reset M365 alert_state so tracking starts fresh with the fixed code
DELETE FROM alert_state WHERE entity_type = 'm365-issue';
