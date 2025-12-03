-- Migration: Optimize SSE Change Detection Queries
-- Date: 2025-12-03
-- Purpose: Add indexes to dramatically reduce rows scanned by MAX(checked_at) queries
-- Impact: Reduces SSE query cost from 12k+ rows to ~5 rows per poll
--
-- Problem: The SSE endpoint (/api/stream) polls 5 tables every 10 seconds with:
--   SELECT MAX(checked_at) FROM table_name WHERE checked_at > ?
-- Without indexes on checked_at alone, these queries cause full table scans
-- (status_history has 12k+ rows, making this extremely expensive)
--
-- Solution: Add DESC indexes on checked_at columns for efficient MAX() lookups
-- SQLite can use DESC indexes very efficiently for MAX() aggregates and
-- ORDER BY ... DESC LIMIT 1 queries used throughout the codebase

-- Index for status_history (12k+ rows - highest priority)
CREATE INDEX IF NOT EXISTS idx_status_history_checked
  ON status_history(checked_at DESC);

-- Index for cloud_status
CREATE INDEX IF NOT EXISTS idx_cloud_status_checked
  ON cloud_status(checked_at DESC);

-- Index for m365_health
CREATE INDEX IF NOT EXISTS idx_m365_health_checked
  ON m365_health(checked_at DESC);

-- Index for isp_check_history
CREATE INDEX IF NOT EXISTS idx_isp_check_history_checked
  ON isp_check_history(checked_at DESC);

-- Note: ransomware_stats already has idx_ransomware_stats_checked
-- from migration 0011, so we don't need to create it again
