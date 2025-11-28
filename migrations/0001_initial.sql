-- Core services (MSP tools)
CREATE TABLE services (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    category TEXT NOT NULL, -- 'msp_tool', 'cloud', 'productivity'
    check_type TEXT NOT NULL, -- 'http', 'statuspage', 'api', 'rss'
    check_url TEXT,
    statuspage_id TEXT,
    supports_warning INTEGER DEFAULT 1,
    display_order INTEGER DEFAULT 0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Service status history
CREATE TABLE status_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    service_id INTEGER NOT NULL,
    status TEXT NOT NULL, -- 'operational', 'degraded', 'outage', 'unknown'
    response_time_ms INTEGER,
    message TEXT,
    checked_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (service_id) REFERENCES services(id)
);

-- Local ISPs
CREATE TABLE local_isps (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    primary_asn INTEGER NOT NULL,
    secondary_asns TEXT, -- JSON array
    display_order INTEGER DEFAULT 0
);

-- ISP check history (from Radar)
CREATE TABLE isp_check_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    isp_id INTEGER NOT NULL,
    check_type TEXT NOT NULL, -- 'iqi', 'speed', 'anomaly', 'bgp_hijack', 'bgp_leak'
    status TEXT NOT NULL,
    response_time_ms INTEGER,
    details TEXT, -- JSON blob
    checked_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (isp_id) REFERENCES local_isps(id)
);

-- Cloud provider status
CREATE TABLE cloud_status (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    provider TEXT NOT NULL, -- 'aws', 'azure', 'gcp'
    overall_status TEXT NOT NULL,
    incidents TEXT, -- JSON array of active incidents
    last_updated TEXT,
    checked_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- M365 service health
CREATE TABLE m365_health (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    service_name TEXT NOT NULL,
    status TEXT NOT NULL,
    issues TEXT, -- JSON array
    checked_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Google Workspace status (simple)
CREATE TABLE gworkspace_status (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    overall_status TEXT NOT NULL,
    incidents TEXT, -- JSON array
    checked_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- API response cache
CREATE TABLE api_cache (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    cache_key TEXT UNIQUE NOT NULL,
    source TEXT NOT NULL,
    data TEXT NOT NULL, -- JSON
    fetched_at TEXT DEFAULT CURRENT_TIMESTAMP,
    expires_at TEXT NOT NULL
);

-- Unified events timeline
CREATE TABLE events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    source TEXT NOT NULL, -- 'service', 'isp', 'cloud', 'grid', 'm365', 'gworkspace', 'radar'
    event_type TEXT NOT NULL,
    severity TEXT NOT NULL, -- 'info', 'warning', 'critical'
    title TEXT NOT NULL,
    description TEXT,
    entity_id TEXT, -- Reference to source entity
    entity_name TEXT,
    occurred_at TEXT NOT NULL,
    resolved_at TEXT,
    expires_at TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Power grid status
CREATE TABLE grid_status (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    region TEXT NOT NULL DEFAULT 'PJM',
    status TEXT NOT NULL,
    demand_mw REAL,
    capacity_mw REAL,
    reserve_margin REAL,
    lmp_price REAL,
    fuel_mix TEXT, -- JSON object
    alerts TEXT, -- JSON array
    checked_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Alert state tracking (for Teams webhooks)
CREATE TABLE alert_state (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    entity_type TEXT NOT NULL, -- 'service', 'isp', 'cloud', 'grid', 'm365'
    entity_id TEXT NOT NULL,
    last_status TEXT NOT NULL,
    last_checked TEXT DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(entity_type, entity_id)
);

-- Alert history
CREATE TABLE alert_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    entity_name TEXT,
    old_status TEXT,
    new_status TEXT NOT NULL,
    alert_sent INTEGER DEFAULT 0,
    webhook_response TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX idx_status_history_service_checked ON status_history(service_id, checked_at);
CREATE INDEX idx_events_occurred ON events(occurred_at);
CREATE INDEX idx_events_source ON events(source, occurred_at);
CREATE INDEX idx_api_cache_key ON api_cache(cache_key);
CREATE INDEX idx_alert_state_entity ON alert_state(entity_type, entity_id);

-- Seed local ISPs
INSERT INTO local_isps (name, primary_asn, secondary_asns, display_order) VALUES
    ('Comcast', 7922, NULL, 1),
    ('PenTeleData', 3737, '["6128"]', 2);

-- Seed MSP services
INSERT INTO services (name, category, check_type, check_url, statuspage_id, display_order) VALUES
    ('Manage', 'msp_tool', 'http', 'https://sscw.stratixsystems.com/', NULL, 1),
    ('Automate', 'msp_tool', 'http', 'https://automate.stratixsystems.com/automate/', NULL, 2),
    ('ScreenConnect', 'msp_tool', 'http', 'https://help.stratixsystems.com/', NULL, 3),
    ('IT Glue', 'msp_tool', 'statuspage', NULL, 'https://status.itglue.com', 4),
    ('Datto', 'msp_tool', 'statuspage', NULL, 'https://status.datto.com', 5),
    ('Proofpoint', 'msp_tool', 'statuspage', NULL, 'https://status.proofpoint.com', 6),
    ('Cisco Umbrella', 'msp_tool', 'statuspage', NULL, 'https://status.umbrella.com', 7),
    ('Duo', 'msp_tool', 'statuspage', NULL, 'https://status.duo.com', 8),
    ('SonicWall', 'msp_tool', 'statuspage', NULL, 'https://status.sonicwall.com', 9),
    ('Huntress', 'msp_tool', 'statuspage', NULL, 'https://status.huntress.io', 10),
    ('CrowdStrike', 'msp_tool', 'statuspage', NULL, 'https://status.crowdstrike.com', 11),
    ('Microsoft 365', 'productivity', 'api', NULL, NULL, 12),
    ('Google Workspace', 'productivity', 'api', NULL, NULL, 13);
