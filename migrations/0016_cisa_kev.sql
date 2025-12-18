-- CISA Known Exploited Vulnerabilities (KEV) tracking
-- Source: https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json

-- Main KEV table
CREATE TABLE IF NOT EXISTS cisa_kev (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    cve_id TEXT UNIQUE NOT NULL,                -- CVE-2024-12345
    vendor_project TEXT NOT NULL,               -- Vendor name
    product TEXT NOT NULL,                      -- Product name
    vulnerability_name TEXT NOT NULL,           -- Short title
    date_added TEXT NOT NULL,                   -- When added to KEV catalog (YYYY-MM-DD)
    due_date TEXT NOT NULL,                     -- Remediation deadline (YYYY-MM-DD)
    short_description TEXT,                     -- Vulnerability description
    required_action TEXT,                       -- CISA recommended action
    known_ransomware_use TEXT,                  -- "Known" or "Unknown"
    notes TEXT,                                 -- Reference links
    first_seen TEXT DEFAULT CURRENT_TIMESTAMP,  -- When we first collected it
    last_seen TEXT DEFAULT CURRENT_TIMESTAMP    -- Last collection timestamp
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_cisa_kev_date_added ON cisa_kev(date_added DESC);
CREATE INDEX IF NOT EXISTS idx_cisa_kev_cve ON cisa_kev(cve_id);
CREATE INDEX IF NOT EXISTS idx_cisa_kev_due_date ON cisa_kev(due_date);
CREATE INDEX IF NOT EXISTS idx_cisa_kev_last_seen ON cisa_kev(last_seen);

-- Catalog metadata (for tracking feed updates)
CREATE TABLE IF NOT EXISTS cisa_kev_metadata (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    catalog_version TEXT NOT NULL,             -- "2025.12.17"
    date_released TEXT NOT NULL,               -- When catalog was published
    total_count INTEGER NOT NULL,              -- Total vulnerabilities in catalog
    checked_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_cisa_kev_metadata_checked ON cisa_kev_metadata(checked_at DESC);
