-- Ransomware monitoring tables

-- Global ransomware statistics
CREATE TABLE ransomware_stats (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    total_victims INTEGER NOT NULL,
    total_groups INTEGER NOT NULL,
    checked_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_ransomware_stats_checked ON ransomware_stats(checked_at);

-- Ransomware victims
CREATE TABLE ransomware_victims (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    victim_id TEXT UNIQUE NOT NULL,    -- External API ID
    victim_name TEXT NOT NULL,
    group_name TEXT NOT NULL,
    country_code TEXT,                 -- ISO 2-letter code (US, GB, etc.)
    sector TEXT,                       -- Industry sector
    discovered_date TEXT NOT NULL,     -- ISO 8601 timestamp
    first_seen TEXT DEFAULT CURRENT_TIMESTAMP,
    last_seen TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_ransomware_victims_discovered ON ransomware_victims(discovered_date DESC);
CREATE INDEX idx_ransomware_victims_group ON ransomware_victims(group_name);
CREATE INDEX idx_ransomware_victims_sector ON ransomware_victims(sector);
CREATE INDEX idx_ransomware_victims_last_seen ON ransomware_victims(last_seen);

-- Daily aggregated victim counts for charts
CREATE TABLE ransomware_daily_counts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT UNIQUE NOT NULL,         -- YYYY-MM-DD format
    victim_count INTEGER NOT NULL,     -- New victims discovered that day
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_ransomware_daily_date ON ransomware_daily_counts(date DESC);

-- Sector statistics (cached)
CREATE TABLE ransomware_sectors (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sector_name TEXT NOT NULL,
    victim_count INTEGER NOT NULL,
    checked_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_ransomware_sectors_checked ON ransomware_sectors(checked_at);
CREATE INDEX idx_ransomware_sectors_count ON ransomware_sectors(victim_count DESC);
