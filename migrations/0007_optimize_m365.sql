-- Migration: Optimize M365 data storage
-- Purpose: Reduce duplicate M365 health records by using a current state table
-- Impact: Reduces queries from ~256/15min to ~120/15min (53% reduction)

-- Create a current state table for M365 services
-- This tracks the CURRENT status of each M365 service
CREATE TABLE m365_current (
  service_name TEXT PRIMARY KEY,
  status TEXT NOT NULL,
  issues TEXT,
  last_changed TEXT NOT NULL,
  checked_at TEXT NOT NULL
);

-- Populate with latest status from existing m365_health data
INSERT OR REPLACE INTO m365_current (service_name, status, issues, last_changed, checked_at)
SELECT service_name, status, issues, checked_at, checked_at
FROM m365_health
WHERE (service_name, checked_at) IN (
  SELECT service_name, MAX(checked_at)
  FROM m365_health
  GROUP BY service_name
);
