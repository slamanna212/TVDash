-- Migration: Additional Performance Indexes
-- Date: 2025-12-03
-- Purpose: Optimize other frequent query patterns throughout the application
--
-- These indexes target specific query patterns that were identified as
-- lacking optimal index coverage, particularly in API endpoints and
-- scheduled task filtering

-- ISP check history lookups (used in /api/internet)
-- Query pattern: WHERE isp_id = ? AND check_type = 'combined' ORDER BY checked_at DESC LIMIT 1
-- This composite index covers all columns in the query for optimal performance
CREATE INDEX IF NOT EXISTS idx_isp_check_history_lookup
  ON isp_check_history(isp_id, check_type, checked_at DESC);

-- Services by check_type (used in scheduled.ts cron tasks)
-- Query patterns:
--   WHERE check_type = 'http'
--   WHERE check_type = 'statuspage'
--   WHERE check_type = 'custom'
-- Speeds up service filtering during cron job execution
CREATE INDEX IF NOT EXISTS idx_services_check_type
  ON services(check_type);

-- Google Workspace status latest record lookup
-- Query pattern: ORDER BY checked_at DESC LIMIT 1
-- Allows efficient retrieval of most recent workspace status
CREATE INDEX IF NOT EXISTS idx_gworkspace_status_checked
  ON gworkspace_status(checked_at DESC);
