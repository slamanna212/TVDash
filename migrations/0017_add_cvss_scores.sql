-- Migration: Add CVSS score support to CISA KEV table
-- Author: Claude
-- Date: 2025-12-18
-- Description: Adds columns to store CVSS scores fetched from NVD API 2.0

-- Add CVSS score columns to existing cisa_kev table
ALTER TABLE cisa_kev ADD COLUMN cvss_score REAL;              -- 0.0-10.0 (CVSS v3.1 baseScore)
ALTER TABLE cisa_kev ADD COLUMN cvss_version TEXT;            -- "3.1", "3.0", or "2.0" (which version used)
ALTER TABLE cisa_kev ADD COLUMN cvss_severity TEXT;           -- "LOW", "MEDIUM", "HIGH", "CRITICAL"
ALTER TABLE cisa_kev ADD COLUMN cvss_vector TEXT;             -- CVSS vector string (e.g., "CVSS:3.1/AV:N/AC:L/...")
ALTER TABLE cisa_kev ADD COLUMN cvss_fetched_at TEXT;         -- When score was last fetched from NVD

-- Index for performance (querying by score, displaying highest CVSS first)
CREATE INDEX IF NOT EXISTS idx_cisa_kev_cvss_score ON cisa_kev(cvss_score DESC);

-- Note: NULL cvss_score means either:
-- 1. Not yet fetched from NVD
-- 2. CVE doesn't exist in NVD database
-- 3. NVD API error during fetch
