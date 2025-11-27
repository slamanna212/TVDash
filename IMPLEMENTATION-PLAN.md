# MSP Status Dashboard - Complete Implementation Plan

**Project:** Public-facing MSP status dashboard for 24/7 display on 4K TV  
**Stack:** Cloudflare Workers (Paid), D1 Database, Vite + React + Mantine UI  
**Author:** Planning session with Claude Opus 4.5  
**For:** Claude Sonnet 4.5 in Claude Code

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Architecture](#2-architecture)
3. [Visual Layout](#3-visual-layout)
4. [Services to Monitor](#4-services-to-monitor)
5. [Dashboard Pages](#5-dashboard-pages)
6. [Data Sources & APIs](#6-data-sources--apis)
7. [Database Schema](#7-database-schema)
8. [API Endpoints](#8-api-endpoints)
9. [Cron Schedule](#9-cron-schedule)
10. [Alerting System](#10-alerting-system)
11. [Project Structure](#11-project-structure)
12. [Configuration Files](#12-configuration-files)
13. [Implementation Phases](#13-implementation-phases)
14. [Styling Guidelines](#14-styling-guidelines)
15. [Technical Notes](#15-technical-notes)
16. [Required Credentials](#16-required-credentials)

---

## 1. Project Overview

Build a real-time status dashboard for an MSP (Managed Service Provider) that displays:
- Service health status for 15+ MSP tools
- Local ISP health monitoring (Comcast, PenTeleData)
- Public cloud status (AWS, Azure, Google Cloud)
- Microsoft 365 and Google Workspace health
- Global internet health metrics via Cloudflare Radar
- Power grid status (PJM region)
- DDoS attack activity
- Unified event timeline

The dashboard will be displayed on a 4K TV in the office, running 24/7.

---

## 2. Architecture

### Technology Stack
- **Runtime:** Cloudflare Workers (Paid plan for cron triggers)
- **Database:** Cloudflare D1 (SQLite)
- **Frontend:** Vite + React 19 + Mantine UI v7
- **Node Version:** 24 or 25
- **Styling:** Dark mode with red accent (#aa182c)

### Data Flow
```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  External APIs  │────▶│  Cron Workers    │────▶│   D1 Database   │
│  Status Pages   │     │  (Collectors)    │     │   (Cache/Store) │
└─────────────────┘     └──────────────────┘     └────────┬────────┘
                                                          │
                                                          ▼
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   4K TV Display │◀────│  React Frontend  │◀────│   API Routes    │
│                 │     │  (Auto-refresh)  │     │   (Workers)     │
└─────────────────┘     └──────────────────┘     └─────────────────┘
```

---

## 3. Visual Layout

### Screen Division
```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│                                                                 │
│                    ROTATING DASHBOARD PAGES                     │
│                         (Top ~85%)                              │
│                                                                 │
│              45-second rotation between pages                   │
│                                                                 │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│  ◀─── SERVICE STATUS TICKER (Bottom ~15%) ───▶  [scrolling]    │
│  [ConnectWise ✓] [IT Glue ✓] [Datto ✓] [M365 ⚠] [AWS ✓] ...   │
└─────────────────────────────────────────────────────────────────┘
```

### Service Ticker Design
- **Full-color background cards** (not just indicator dots)
- Continuous horizontal scroll (seamless loop)
- Card colors:
  - **Green (#2f9e44):** Operational
  - **Yellow (#fab005):** Warning/Degraded
  - **Red (#e03131):** Outage (with pulse animation)
  - **Gray (#495057):** Unknown/Checking
- Cards show: Service name + optional subtitle (status text, response time)

### Dashboard Pages (Rotating every 45 seconds)
1. **Internet Status Page** - Local ISP health + global internet quality
2. **Cloud Status Page** - AWS, Azure, Google Cloud combined view
3. **M365 & Workspace Page** - Microsoft 365 (primary) + Google Workspace (secondary)
4. **Cloudflare Radar / Attack Activity** - L3/L7 DDoS volume, attack breakdown
5. **Power Grid Status** - PJM grid conditions, demand, generation mix
6. **Events/Alerts Page** - Unified timeline of all notable events

---

## 4. Services to Monitor

### MSP Tools (13 services)

| Service | Check Type | Source |
|---------|-----------|--------|
| ConnectWise Manage | HTTP Check | https://sscw.stratixsystems.com/ |
| ConnectWise Automate | HTTP Check | https://automate.stratixsystems.com/automate/ |
| ScreenConnect | HTTP Check | https://help.stratixsystems.com/ |
| IT Glue | Statuspage | https://status.itglue.com |
| Datto | Statuspage | https://status.datto.com |
| Proofpoint | Statuspage | https://status.proofpoint.com |
| Cisco Umbrella | Statuspage | https://status.umbrella.com |
| Duo | Statuspage | https://status.duo.com |
| SonicWall | StatusHub | https://status.sonicwall.com |
| Intermedia Elevate | TBD | HTTP or Statuspage |
| Microsoft 365 | Graph API | Service Communications API |
| Huntress | Statuspage | https://status.huntress.io |
| CrowdStrike | Statuspage | https://status.crowdstrike.com |

### Local ISPs (2 services)

| ISP | Primary ASN | Secondary ASNs |
|-----|-------------|----------------|
| Comcast | AS7922 |  |
| PenTeleData | AS3737 | AS6128 |

### Public Cloud Providers (3 services)

| Provider | Data Source | Notes |
|----------|-------------|-------|
| AWS | RSS Feed + Scraping | https://health.aws.amazon.com - RSS feeds per service/region |
| Azure | RSS Feed | https://status.azure.com/en-us/status - RSS feed available |
| Google Cloud | JSON Feed | https://status.cloud.google.com - JSON endpoint available |

### Productivity Suites (2 services)

| Service | Data Source | Notes |
|---------|-------------|-------|
| Microsoft 365 | Graph API | `https://graph.microsoft.com/v1.0/admin/serviceAnnouncement/healthOverviews` - Requires Azure AD app with ServiceHealth.Read.All permission. **PRIMARY FOCUS** - Show detailed breakdown by service (Exchange, Teams, SharePoint, etc.) |
| Google Workspace | JSON Feed | `https://www.google.com/appsstatus/dashboard/incidents.json` - Free, no auth required. **SECONDARY** - Basic status only |

---

## 5. Dashboard Pages

### Page 1: Internet Status
**Content:**
- Local ISP cards (Comcast, PenTeleData) with:
  - Current status (operational/degraded/outage)
  - Bandwidth/latency percentiles from Cloudflare Radar IQI
  - Any active traffic anomalies
  - BGP incident indicators
- Global internet health summary
- Recent outage annotations

### Page 2: Cloud Status (AWS, Azure, Google Cloud)
**Content:**
- Three-column layout, one per provider
- Overall status indicator for each
- List of any active incidents
- Affected services/regions
- Last updated timestamp
- Visual: Cloud provider logos with status halos

### Page 3: M365 & Google Workspace
**Content:**
- **Microsoft 365 (75% of page):**
  - Overall health status
  - Grid of services: Exchange, Teams, SharePoint, OneDrive, Intune, Entra ID, etc.
  - Active incidents with severity and affected features
  - Message center highlights (major changes)
- **Google Workspace (25% of page):**
  - Simple status indicators for: Gmail, Drive, Calendar, Meet
  - Any active incidents

### Page 4: Attack Activity (Cloudflare Radar)
**Content:**
- L3 DDoS attack volume chart (time series)
- L7 attack volume chart
- Attack breakdown by type (pie/donut chart)
- Top attack vectors
- Geographic attack origin map (if feasible)

### Page 5: Power Grid Status
**Content:**
- PJM region status indicator
- Current demand vs capacity
- Reserve margin percentage
- Real-time LMP (Locational Marginal Pricing)
- Generation mix breakdown (pie chart: nuclear, gas, coal, renewables)
- Any active grid alerts

### Page 6: Events Timeline
**Content:**
- Unified chronological feed of:
  - Service status changes
  - ISP anomalies
  - Cloud provider incidents
  - BGP incidents
  - Grid alerts
  - M365/Workspace incidents
- Color-coded by severity
- Filterable by source (optional)

---

## 6. Data Sources & APIs

### Cloudflare Radar API
**Base URL:** `https://api.cloudflare.com/client/v4/radar/`  
**Auth:** Bearer token with `Account.Cloudflare Radar:Read` permission

| Endpoint | Purpose | Refresh |
|----------|---------|---------|
| `/quality/iqi/summary?asn=X` | Bandwidth/latency percentiles by ASN | 15 min |
| `/quality/speed/summary?asn=X` | Speed test aggregates | 15 min |
| `/traffic_anomalies?asn=X` | Traffic drops (outage detection) | 5 min |
| `/bgp/hijacks/events?involvedAsn=X` | BGP hijacks | 5 min |
| `/bgp/leaks/events?involvedAsn=X` | BGP route leaks | 5 min |
| `/annotations/outages` | Global internet outages | 5 min |
| `/attacks/layer3/timeseries` | L3 DDoS volume | 5 min |
| `/attacks/layer7/timeseries` | L7 attack volume | 5 min |
| `/attacks/layer7/summary/{dimension}` | Attack breakdown | 15 min |

### Microsoft 365 Service Communications (Graph API)
**Base URL:** `https://graph.microsoft.com/v1.0/admin/serviceAnnouncement/`  
**Auth:** OAuth 2.0 with Azure AD app (client credentials flow)  
**Permissions:** `ServiceHealth.Read.All` (Application)

| Endpoint | Purpose |
|----------|---------|
| `/healthOverviews` | Overall health status per service |
| `/healthOverviews/{service}/issues` | Active issues for a service |
| `/issues` | All current issues across services |
| `/messages` | Message center posts (planned changes) |

**Services to monitor:** Exchange Online, Microsoft Teams, SharePoint Online, OneDrive for Business, Microsoft Intune, Microsoft Entra ID, Microsoft 365 Apps, Power Platform

### Google Workspace Status
**Endpoints (no auth required):**
- `https://www.google.com/appsstatus/dashboard/incidents.json` - Current incidents
- `https://www.google.com/appsstatus/dashboard/products.json` - Product catalog

### Google Cloud Status
**Endpoints (no auth required):**
- `https://status.cloud.google.com/incidents.json` - Current incidents
- RSS feed also available

### AWS Health
**Public Status (no auth - for public incidents):**
- RSS feeds per service: `https://status.aws.amazon.com/rss/{service}.rss`
- Main page: `https://health.aws.amazon.com/health/status`

**Note:** AWS Health API requires Business/Enterprise support plan. For this dashboard, use public RSS feeds for major services (EC2, S3, RDS, Lambda, CloudFront).

**Key RSS feeds to monitor:**
- `ec2-us-east-1.rss`, `ec2-us-west-2.rss`
- `s3-us-standard.rss`
- `lambda-us-east-1.rss`
- `rds-us-east-1.rss`

### Azure Status
**Endpoints:**
- RSS Feed: `https://azure.status.microsoft/en-us/status/feed/`
- Azure Resource Health API (requires Azure subscription): `https://management.azure.com/subscriptions/{id}/providers/Microsoft.ResourceHealth/availabilityStatuses`

For simplicity, use RSS feed parsing for public status.

### Atlassian Statuspage API (for MSP tools)
Most MSP tools use Atlassian Statuspage. Standard endpoints:

```
https://{statuspage-url}/api/v2/summary.json     # Overall summary
https://{statuspage-url}/api/v2/status.json      # Just status
https://{statuspage-url}/api/v2/components.json  # All components
https://{statuspage-url}/api/v2/incidents.json   # Active incidents
```

### Power Grid APIs

**EIA (Energy Information Administration):**
- Base URL: `https://api.eia.gov/v2/electricity/rto/`
- Requires free API key from eia.gov/opendata
- Data: Hourly demand, generation by fuel type, interchange

**PJM Data Miner:**
- Base URL: `https://dataminer2.pjm.com/`
- Requires free registration for API key
- Data: Real-time LMP, reserves, grid alerts

---

## 7. Database Schema

```sql
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
```

---

## 8. API Endpoints

### Frontend API Routes

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/services` | All services with current status (for ticker) |
| GET | `/api/services/:id/history` | Historical data for a service (7 days) |
| GET | `/api/internet` | ISP status + global internet health |
| GET | `/api/cloud` | AWS, Azure, GCP combined status |
| GET | `/api/m365` | Microsoft 365 health overview |
| GET | `/api/gworkspace` | Google Workspace status |
| GET | `/api/radar/attacks` | Attack activity data |
| GET | `/api/grid` | Power grid status |
| GET | `/api/events` | Unified event timeline |
| GET | `/api/events?source=X` | Filtered events by source |

### Response Formats

**GET /api/services**
```json
{
  "services": [
    {
      "id": 1,
      "name": "ConnectWise Manage",
      "category": "msp_tool",
      "status": "operational",
      "statusText": "All systems operational",
      "responseTime": 245,
      "lastChecked": "2025-11-27T12:00:00Z"
    }
  ],
  "summary": {
    "total": 15,
    "operational": 13,
    "degraded": 1,
    "outage": 0,
    "unknown": 1
  }
}
```

**GET /api/cloud**
```json
{
  "providers": [
    {
      "name": "AWS",
      "status": "operational",
      "incidents": [],
      "lastUpdated": "2025-11-27T12:00:00Z"
    },
    {
      "name": "Azure",
      "status": "degraded",
      "incidents": [
        {
          "title": "Azure Portal - Degraded Performance",
          "severity": "warning",
          "regions": ["East US"],
          "startTime": "2025-11-27T10:30:00Z"
        }
      ],
      "lastUpdated": "2025-11-27T12:00:00Z"
    },
    {
      "name": "Google Cloud",
      "status": "operational",
      "incidents": [],
      "lastUpdated": "2025-11-27T12:00:00Z"
    }
  ]
}
```

**GET /api/m365**
```json
{
  "overall": "operational",
  "services": [
    {
      "name": "Exchange Online",
      "status": "operational",
      "issues": []
    },
    {
      "name": "Microsoft Teams",
      "status": "degraded",
      "issues": [
        {
          "id": "TM123456",
          "title": "Users may experience delays in message delivery",
          "severity": "advisory",
          "startTime": "2025-11-27T11:00:00Z",
          "lastUpdate": "2025-11-27T11:45:00Z"
        }
      ]
    }
  ],
  "lastChecked": "2025-11-27T12:00:00Z"
}
```

---

## 9. Cron Schedule

```
┌─────────────────────────────────────────────────────────────────┐
│ Every 1 minute:                                                 │
│   - Internal HTTP checks (ConnectWise Manage/Automate/Screen)   │
│   - ISP HTTP checks (if configured)                             │
├─────────────────────────────────────────────────────────────────┤
│ Every 5 minutes:                                                │
│   - Statuspage polling (all MSP tools)                          │
│   - Cloud status (AWS RSS, Azure RSS, GCP JSON)                 │
│   - Microsoft 365 Graph API                                     │
│   - Google Workspace JSON                                       │
│   - Radar: outages, anomalies, attacks, BGP                     │
│   - EIA grid data                                               │
│   - PJM data (if configured)                                    │
│   - Event aggregation                                           │
│   - Alert processing (Teams webhooks)                           │
├─────────────────────────────────────────────────────────────────┤
│ Every 15 minutes:                                               │
│   - Radar IQI/Speed metrics                                     │
│   - Attack breakdown summaries                                  │
├─────────────────────────────────────────────────────────────────┤
│ Daily at 3 AM:                                                  │
│   - Data cleanup (prune records > 30 days)                      │
│   - Cache cleanup                                               │
└─────────────────────────────────────────────────────────────────┘
```

---

## 10. Alerting System

### Microsoft Teams Webhook Integration

**Webhook URL:** Stored in Workers secret `TEAMS_WEBHOOK_URL`

**Alert Triggers:**
1. Service status changes (operational ↔ warning ↔ outage)
2. ISP traffic anomalies
3. BGP incidents (hijacks/leaks)
4. Cloud provider incidents
5. M365 service degradation/outage
6. Power grid enters alert/emergency status

**Alert Logic:**
- Compare current status to `alert_state` table
- Only alert on meaningful transitions:
  - Always alert: `* → outage`
  - Alert: `operational → warning`
  - Alert (recovery): `outage/warning → operational`
- Debounce: Don't re-alert within 5 minutes for same entity

**Adaptive Card Template (Service Status Change):**
```json
{
  "type": "message",
  "attachments": [{
    "contentType": "application/vnd.microsoft.card.adaptive",
    "content": {
      "type": "AdaptiveCard",
      "$schema": "http://adaptivecards.io/schemas/adaptive-card.json",
      "version": "1.4",
      "body": [
        {
          "type": "Container",
          "style": "attention",
          "items": [
            {
              "type": "TextBlock",
              "text": "🔴 Service Outage Detected",
              "weight": "Bolder",
              "size": "Medium"
            }
          ]
        },
        {
          "type": "FactSet",
          "facts": [
            { "title": "Service:", "value": "${serviceName}" },
            { "title": "Previous Status:", "value": "${oldStatus}" },
            { "title": "Current Status:", "value": "${newStatus}" },
            { "title": "Time:", "value": "${timestamp}" }
          ]
        }
      ]
    }
  }]
}
```

**Rate Limits:** 4 requests/second to Teams webhook, 28 KB max message size

---

## 11. Project Structure

```
msp-dashboard/
├── wrangler.toml
├── package.json
├── tsconfig.json
├── migrations/
│   └── 0001_initial.sql
├── src/
│   ├── index.ts                    # Main worker entry
│   ├── scheduled.ts                # Cron handler dispatcher
│   ├── types.ts                    # TypeScript interfaces
│   │
│   ├── api/                        # API route handlers
│   │   ├── routes.ts               # Router setup
│   │   ├── services.ts             # /api/services
│   │   ├── internet.ts             # /api/internet
│   │   ├── cloud.ts                # /api/cloud
│   │   ├── m365.ts                 # /api/m365
│   │   ├── gworkspace.ts           # /api/gworkspace
│   │   ├── radar.ts                # /api/radar/*
│   │   ├── grid.ts                 # /api/grid
│   │   └── events.ts               # /api/events
│   │
│   ├── collectors/                 # Data collection modules
│   │   ├── http-check.ts           # Generic HTTP health check
│   │   ├── statuspage.ts           # Atlassian Statuspage parser
│   │   ├── statushub.ts            # StatusHub parser (SonicWall)
│   │   ├── rss-parser.ts           # RSS feed parser
│   │   │
│   │   ├── cloud/
│   │   │   ├── aws.ts              # AWS status collector
│   │   │   ├── azure.ts            # Azure status collector
│   │   │   └── gcp.ts              # Google Cloud collector
│   │   │
│   │   ├── productivity/
│   │   │   ├── microsoft.ts        # M365 Graph API collector
│   │   │   └── gworkspace.ts       # Google Workspace collector
│   │   │
│   │   ├── isp/
│   │   │   └── radar-isp.ts        # ISP checks via Cloudflare Radar
│   │   │
│   │   ├── radar/
│   │   │   ├── quality.ts          # IQI/Speed metrics
│   │   │   ├── anomalies.ts        # Traffic anomalies
│   │   │   ├── bgp.ts              # BGP hijacks/leaks
│   │   │   ├── outages.ts          # Global outages
│   │   │   └── attacks.ts          # L3/L7 attack data
│   │   │
│   │   └── grid/
│   │       ├── eia.ts              # EIA API collector
│   │       └── pjm.ts              # PJM API collector
│   │
│   ├── alerting/
│   │   ├── index.ts                # Alert processor
│   │   ├── comparator.ts           # Status change detection
│   │   ├── teams.ts                # Teams webhook sender
│   │   └── templates.ts            # Adaptive Card templates
│   │
│   ├── db/
│   │   ├── schema.sql              # Full schema (reference)
│   │   └── queries.ts              # Database query helpers
│   │
│   └── utils/
│       ├── cache.ts                # API response caching
│       ├── status.ts               # Status determination logic
│       └── time.ts                 # Time formatting utilities
│
└── frontend/
    ├── index.html
    ├── vite.config.ts
    ├── tsconfig.json
    ├── package.json
    │
    └── src/
        ├── main.tsx
        ├── App.tsx
        ├── theme.ts                # Mantine theme config
        │
        ├── components/
        │   ├── Layout.tsx          # Main layout wrapper
        │   ├── ServiceTicker.tsx   # Bottom scrolling ticker
        │   ├── ServiceCard.tsx     # Individual service card
        │   ├── PageContainer.tsx   # Rotating page container
        │   ├── PageTransition.tsx  # Transition animations
        │   ├── StatusBadge.tsx     # Reusable status indicator
        │   └── LoadingState.tsx    # Loading skeleton
        │
        ├── pages/
        │   ├── InternetStatusPage.tsx
        │   ├── CloudStatusPage.tsx
        │   ├── M365WorkspacePage.tsx
        │   ├── RadarAttacksPage.tsx
        │   ├── PowerGridPage.tsx
        │   └── EventsPage.tsx
        │
        ├── hooks/
        │   ├── useAutoRefresh.ts   # Auto-refresh data hook
        │   ├── usePageRotation.ts  # Page rotation logic
        │   └── useTickerData.ts    # Ticker data fetching
        │
        └── api/
            └── client.ts           # API client functions
```

---

## 12. Configuration Files

### wrangler.toml
```toml
name = "msp-dashboard"
main = "src/index.ts"
compatibility_date = "2024-01-01"
compatibility_flags = ["nodejs_compat"]

[triggers]
crons = [
  "* * * * *",        # Every minute
  "*/5 * * * *",      # Every 5 minutes  
  "*/15 * * * *",     # Every 15 minutes
  "0 3 * * *"         # Daily at 3 AM
]

[[d1_databases]]
binding = "DB"
database_name = "msp-dashboard"
database_id = "your-database-id-here"

[site]
bucket = "./frontend/dist"

[vars]
ENVIRONMENT = "production"
ALERTS_ENABLED = "true"
PAGE_ROTATION_SECONDS = "45"
TICKER_REFRESH_SECONDS = "30"

# Secrets (set via: wrangler secret put SECRET_NAME)
# CF_RADAR_API_TOKEN
# EIA_API_KEY
# PJM_API_KEY
# TEAMS_WEBHOOK_URL
# M365_TENANT_ID
# M365_CLIENT_ID
# M365_CLIENT_SECRET
```

### package.json (Worker)
```json
{
  "name": "msp-dashboard-worker",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "wrangler dev",
    "deploy": "wrangler deploy",
    "db:migrate": "wrangler d1 migrations apply msp-dashboard"
  },
  "devDependencies": {
    "@cloudflare/workers-types": "^4.20241127.0",
    "typescript": "^5.3.0",
    "wrangler": "^3.91.0"
  }
}
```

### package.json (Frontend)
```json
{
  "name": "msp-dashboard-frontend",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "@mantine/core": "^7.13.0",
    "@mantine/hooks": "^7.13.0",
    "@tabler/icons-react": "^3.21.0",
    "react": "^18.3.0",
    "react-dom": "^18.3.0",
    "recharts": "^2.13.0"
  },
  "devDependencies": {
    "@types/react": "^18.3.0",
    "@types/react-dom": "^18.3.0",
    "@vitejs/plugin-react": "^4.3.0",
    "postcss": "^8.4.0",
    "postcss-preset-mantine": "^1.17.0",
    "postcss-simple-vars": "^7.0.0",
    "typescript": "^5.3.0",
    "vite": "^5.4.0"
  }
}
```

---

## 13. Implementation Phases

### Phase 1: Foundation (Day 1)
- [ ] Initialize project structure
- [ ] Create wrangler.toml
- [ ] Set up D1 database with full schema
- [ ] Create migration file
- [ ] Seed services table with all 15+ services
- [ ] Basic Worker entry point

### Phase 2: Service Status Collectors (Day 2)
- [ ] HTTP health check module
- [ ] Atlassian Statuspage parser
- [ ] RSS feed parser (for AWS/Azure)
- [ ] StatusHub parser (for SonicWall)
- [ ] Cron trigger for 1-minute and 5-minute checks
- [ ] Status history recording

### Phase 3: Cloud & Productivity Collectors (Day 3)
- [ ] AWS status collector (RSS parsing)
- [ ] Azure status collector (RSS parsing)
- [ ] Google Cloud status collector (JSON)
- [ ] Microsoft 365 Graph API collector
- [ ] Google Workspace JSON collector
- [ ] OAuth token management for M365

### Phase 4: Frontend Shell (Day 4)
- [ ] Vite + React + Mantine setup
- [ ] Dark theme configuration
- [ ] Main layout component
- [ ] Service ticker component (static)
- [ ] Page container with placeholder pages

### Phase 5: Live Ticker (Day 5)
- [ ] `/api/services` endpoint
- [ ] Connect ticker to API
- [ ] Auto-refresh hook (30 second interval)
- [ ] Full-color status cards
- [ ] Continuous scroll animation
- [ ] Pulse animation for outages

### Phase 6: Dashboard Pages - Part 1 (Day 6)
- [ ] Internet Status page with ISP cards
- [ ] Cloud Status page (AWS/Azure/GCP)
- [ ] M365 & Workspace page
- [ ] API endpoints for each

### Phase 7: Cloudflare Radar Integration (Day 7)
- [ ] Radar API client
- [ ] IQI/Speed metrics collector
- [ ] Traffic anomaly collector
- [ ] BGP incident collector
- [ ] Attack data collector
- [ ] Radar/Attacks dashboard page

### Phase 8: Power Grid & Events (Day 8)
- [ ] EIA API collector
- [ ] PJM API collector (optional)
- [ ] Power Grid dashboard page
- [ ] Event aggregation logic
- [ ] Events timeline page

### Phase 9: Alerting System (Day 9)
- [ ] Alert state tracking
- [ ] Status change comparator
- [ ] Teams webhook sender
- [ ] Adaptive Card templates
- [ ] Alert history logging

### Phase 10: Polish & Testing (Day 10)
- [ ] Page rotation system (45s intervals)
- [ ] Smooth page transitions
- [ ] Responsive scaling (1080p to 4K)
- [ ] Error handling & fallbacks
- [ ] 4K TV testing
- [ ] Performance optimization

---

## 14. Styling Guidelines

### CSS Variables
```css
:root {
  /* Layout */
  --ticker-height: 12vh;
  --card-min-width: 8vw;
  --page-padding: 2vw;
  
  /* Typography */
  --font-base: 1.2vw;
  --font-large: 2vw;
  --font-xlarge: 3vw;
  
  /* Status Colors */
  --status-operational: #2f9e44;
  --status-warning: #fab005;
  --status-outage: #e03131;
  --status-unknown: #495057;
  
  /* Theme */
  --accent-color: #e53935;
  --bg-primary: #1a1b1e;
  --bg-secondary: #25262b;
  --text-primary: #c1c2c5;
  --text-secondary: #909296;
}
```

### Service Ticker Animation
```css
@keyframes ticker-scroll {
  0% { transform: translateX(0); }
  100% { transform: translateX(-50%); }
}

.ticker-track {
  display: flex;
  animation: ticker-scroll 60s linear infinite;
}

@keyframes pulse-outage {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.6; }
}

.status-outage {
  animation: pulse-outage 1.5s ease-in-out infinite;
}
```

### Mantine Theme
```typescript
import { createTheme } from '@mantine/core';

export const theme = createTheme({
  primaryColor: 'red',
  colors: {
    dark: [
      '#C1C2C5', '#A6A7AB', '#909296', '#5c5f66',
      '#373A40', '#2C2E33', '#25262B', '#1A1B1E',
      '#141517', '#101113',
    ],
  },
  defaultRadius: 'md',
  fontFamily: 'Inter, system-ui, sans-serif',
  headings: {
    fontFamily: 'Inter, system-ui, sans-serif',
  },
});
```

---

## 15. Technical Notes

### Cloudflare Workers Limitations
- No ICMP ping (no raw sockets) - use HTTP checks instead
- 50ms CPU time on free tier, 30s on paid
- D1 has 100,000 rows/day writes on free, higher on paid
- Cron triggers require paid plan for sub-minute intervals

### API Considerations
- **AWS Health API** requires Business/Enterprise support - use public RSS instead
- **Azure Resource Health API** requires Azure subscription - use public RSS instead
- **M365 Graph API** requires Azure AD app registration with admin consent
- **Cloudflare Radar API** is free with API token
- **EIA API** is free with registration
- **Google Workspace/Cloud status** endpoints are public, no auth needed

### Status Page Formats
- Most MSP tools use **Atlassian Statuspage** format
- SonicWall uses **StatusHub** (different JSON structure)
- Some may have custom formats - check individual status pages

### Display Considerations
- Use `vw`/`vh` units for 4K scaling
- Test at both 1080p and 4K resolutions
- Minimize animations to prevent OLED burn-in
- High contrast for readability from across room

---

## 16. Required Credentials

Before deployment, gather these credentials:

| Credential | How to Obtain | Secret Name |
|------------|---------------|-------------|
| Cloudflare Radar API Token | Cloudflare Dashboard → API Tokens → Create with "Account.Cloudflare Radar:Read" | `CF_RADAR_API_TOKEN` |
| EIA API Key | https://www.eia.gov/opendata/register.php | `EIA_API_KEY` |
| PJM API Key | https://dataminer2.pjm.com (optional) | `PJM_API_KEY` |
| Teams Webhook URL | Teams channel → Connectors → Incoming Webhook | `TEAMS_WEBHOOK_URL` |
| M365 Tenant ID | Azure Portal → Entra ID → Overview | `M365_TENANT_ID` |
| M365 Client ID | Azure Portal → App Registrations → Your App | `M365_CLIENT_ID` |
| M365 Client Secret | Azure Portal → App Registrations → Certificates & Secrets | `M365_CLIENT_SECRET` |

### M365 Azure AD App Setup
1. Go to Azure Portal → Entra ID → App registrations
2. New registration → Name it "MSP Dashboard"
3. Add API permission: Microsoft Graph → Application → `ServiceHealth.Read.All`
4. Grant admin consent
5. Create client secret
6. Note: Tenant ID, Client ID, Client Secret

### Internal Service URLs (TBD)
- ConnectWise Manage: `https://your-cw-manage.example.com/health`
- ConnectWise Automate: `https://your-cw-automate.example.com/health`
- ScreenConnect: `https://your-screenconnect.example.com/health`

---

## Quick Start for Sonnet 4.5

1. **Create the project:**
   ```bash
   mkdir msp-dashboard && cd msp-dashboard
   npm init -y
   ```

2. **Initialize Cloudflare Workers:**
   ```bash
   npx wrangler init
   ```

3. **Create D1 database:**
   ```bash
   npx wrangler d1 create msp-dashboard
   ```

4. **Copy the database ID to wrangler.toml**

5. **Run the migration:**
   ```bash
   npx wrangler d1 migrations apply msp-dashboard
   ```

6. **Set secrets:**
   ```bash
   npx wrangler secret put CF_RADAR_API_TOKEN
   npx wrangler secret put EIA_API_KEY
   npx wrangler secret put TEAMS_WEBHOOK_URL
   # etc.
   ```

7. **Start development:**
   ```bash
   npm run dev
   ```

---

*End of Implementation Plan*|

### Public Cloud Providers (3 services)

| Provider | Check Method | Status URL |
|----------|--------------|------------|
| AWS | RSS Feed + Scrape | https://health.aws.amazon.com/health/status |
| Azure | RSS Feed | https://status.azure.com/en-us/status |
| Google Cloud | JSON Feed | https://status.cloud.google.com/ |

### Productivity Suites (2 services)

| Service | Check Method | Notes |
|---------|--------------|-------|
| Microsoft 365 | Graph API | Full breakdown by service (Exchange, Teams, SharePoint, etc.) - PRIMARY FOCUS |
| Google Workspace | JSON Feed | Basic status only - https://www.google.com/appsstatus/dashboard/incidents.json |

---

## 5. Dashboard Pages

### Page 1: Internet Status
- **Local ISP Cards:** Comcast and PenTeleData status with latency/bandwidth metrics from Cloudflare Radar
- **Global Internet Quality:** Overall internet health score
- **Traffic Anomalies:** Any detected outages or unusual patterns
- **BGP Incidents:** Hijacks or leaks affecting monitored ASNs

### Page 2: Cloud Status (AWS, Azure, Google Cloud)
Combined view of the "big 3" cloud providers:
- **AWS Section:** Core services status (EC2, S3, Lambda, RDS, CloudFront)
- **Azure Section:** Core services status (VMs, Storage, App Service, SQL)
- **Google Cloud Section:** Core services status (Compute, Storage, Cloud Run, BigQuery)
- Show regional focus on US-East for all three
- Visual: Three columns or card grid with provider logos

### Page 3: M365 & Google Workspace
**Microsoft 365 (Primary - 75% of page):**
- Exchange Online status
- Microsoft Teams status
- SharePoint Online status
- OneDrive status
- Azure AD / Entra status
- Outlook status
- Active incidents with descriptions

**Google Workspace (Secondary - 25% of page):**
- Gmail status
- Google Drive status
- Google Meet status
- Simple operational/degraded/outage indicators

### Page 4: Cloudflare Radar / Attack Activity
- **L3 DDoS Volume:** Time series chart of Layer 3 attack traffic
- **L7 DDoS Volume:** Time series chart of Layer 7 attack traffic
- **Attack Breakdown:** By protocol, attack vector, source country
- **Global Threat Map:** Visual representation if feasible

### Page 5: Power Grid Status
- **PJM Grid Status:** Current operational status
- **Demand vs Capacity:** Current load and available capacity
- **Reserve Margin:** Percentage buffer
- **LMP Prices:** Locational Marginal Pricing ($/MWh)
- **Generation Mix:** Pie chart of fuel sources (nuclear, gas, coal, renewables)

### Page 6: Events/Alerts Timeline
- Unified chronological feed of all notable events:
  - Service outages and recoveries
  - ISP anomalies
  - BGP incidents
  - Cloud provider incidents
  - Grid alerts
- Filterable by severity (Critical, Warning, Info)
- Auto-scroll through recent events

---

## 6. Data Sources & APIs

### Cloudflare Radar API (Free with token)
**Base URL:** `https://api.cloudflare.com/client/v4/radar/`  
**Auth:** Bearer token with `Account.Cloudflare Radar:Read` permission

| Endpoint | Purpose | Refresh |
|----------|---------|---------|
| `/quality/iqi/summary?asn=X` | Bandwidth/latency percentiles by ASN | 15 min |
| `/quality/speed/summary?asn=X` | Speed test aggregates by ASN | 15 min |
| `/traffic_anomalies?asn=X` | Traffic drops indicating outages | 5 min |
| `/bgp/hijacks/events?involvedAsn=X` | BGP hijacks | 5 min |
| `/bgp/leaks/events?involvedAsn=X` | BGP route leaks | 5 min |
| `/annotations/outages` | Global internet outages | 5 min |
| `/attacks/layer3/timeseries` | L3 DDoS volume | 5 min |
| `/attacks/layer7/timeseries` | L7 attack volume | 5 min |
| `/attacks/layer7/summary/{dimension}` | Attack breakdown | 15 min |

### Microsoft 365 - Graph API Service Communications
**Base URL:** `https://graph.microsoft.com/v1.0/admin/serviceAnnouncement/`  
**Auth:** Azure AD App Registration with `ServiceHealth.Read.All` permission

| Endpoint | Purpose |
|----------|---------|
| `/healthOverviews` | Current status of all M365 services |
| `/issues` | Active service health issues |
| `/messages` | Message center posts and updates |

**Sample Response Structure:**
```json
{
  "value": [
    {
      "service": "Exchange Online",
      "status": "serviceDegradation",
      "id": "Exchange"
    }
  ]
}
```

### Google Workspace Status (Public JSON)
**Incidents:** `https://www.google.com/appsstatus/dashboard/incidents.json`  
**No auth required**

Parse for `service_name` and status indicators. Focus on: Gmail, Google Drive, Google Meet, Google Calendar.

### Google Cloud Status (Public JSON)
**URL:** `https://status.cloud.google.com/incidents.json`  
**No auth required**

### AWS Health Status
**Public RSS Feeds:** `https://status.aws.amazon.com/rss/[service].rss`  
**Example:** `https://status.aws.amazon.com/rss/ec2-us-east-1.rss`

Key services to monitor:
- `ec2-us-east-1` - EC2 US East
- `s3-us-standard` - S3 US Standard
- `lambda-us-east-1` - Lambda US East
- `rds-us-east-1` - RDS US East

**Note:** The full AWS Health API requires Business/Enterprise Support. Use public RSS feeds instead.

### Azure Status
**RSS Feed:** `https://azure.status.microsoft/en-us/status/feed/`  
**Alternative:** Azure Resource Health API (requires Azure subscription)

Key services: Virtual Machines, Storage, App Service, Azure SQL, Azure AD

### Atlassian Statuspage API (Standard format for most services)
**Base pattern:** `https://[statuspage-domain]/api/v2/summary.json`

Example for IT Glue:
```
GET https://status.itglue.com/api/v2/summary.json
```

**Response structure:**
```json
{
  "status": {
    "indicator": "none|minor|major|critical",
    "description": "All Systems Operational"
  },
  "components": [
    {
      "name": "API",
      "status": "operational|degraded_performance|partial_outage|major_outage"
    }
  ]
}
```

### Power Grid APIs

**EIA API (Free):**
- **Base:** `https://api.eia.gov/v2/electricity/rto/`
- **Auth:** API key (free registration at eia.gov/opendata)
- **Data:** Hourly demand, generation by fuel type, interchange

**PJM Data Miner (Free with registration):**
- **Base:** `https://dataminer2.pjm.com/`
- **Data:** Real-time LMP prices, operational reserves, grid alerts

---

## 7. Database Schema

```sql
-- Core services table
CREATE TABLE services (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  category TEXT NOT NULL, -- 'msp_tool', 'cloud', 'productivity'
  check_type TEXT NOT NULL, -- 'http', 'statuspage', 'api', 'rss'
  check_url TEXT,
  statuspage_url TEXT,
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

-- ISP check history
CREATE TABLE isp_check_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  isp_id INTEGER NOT NULL,
  check_type TEXT NOT NULL, -- 'iqi', 'speed', 'anomaly', 'bgp'
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
  service_name TEXT NOT NULL,
  region TEXT,
  status TEXT NOT NULL,
  message TEXT,
  incident_id TEXT,
  checked_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- M365 service status
CREATE TABLE m365_status (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  service_id TEXT NOT NULL, -- 'Exchange', 'Teams', etc.
  service_name TEXT NOT NULL,
  status TEXT NOT NULL,
  issues TEXT, -- JSON array of active issues
  checked_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Google Workspace status
CREATE TABLE gworkspace_status (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  service_name TEXT NOT NULL,
  status TEXT NOT NULL,
  incident_id TEXT,
  checked_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- API response cache
CREATE TABLE api_cache (
  key TEXT PRIMARY KEY,
  source TEXT NOT NULL,
  data TEXT NOT NULL, -- JSON blob
  fetched_at TEXT DEFAULT CURRENT_TIMESTAMP,
  expires_at TEXT NOT NULL
);

-- Unified events table
CREATE TABLE events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  source TEXT NOT NULL, -- 'service', 'isp', 'cloud', 'grid', 'radar'
  event_type TEXT NOT NULL, -- 'outage', 'recovery', 'anomaly', 'attack', 'alert'
  severity TEXT NOT NULL, -- 'critical', 'warning', 'info'
  title TEXT NOT NULL,
  description TEXT,
  entity_id TEXT, -- Reference to source entity
  occurred_at TEXT NOT NULL,
  expires_at TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Power grid status
CREATE TABLE grid_status (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  region TEXT NOT NULL DEFAULT 'PJM',
  status TEXT NOT NULL, -- 'normal', 'caution', 'warning', 'emergency'
  demand_mw INTEGER,
  capacity_mw INTEGER,
  reserve_margin REAL,
  lmp_price REAL,
  fuel_mix TEXT, -- JSON object
  checked_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Alert state tracking (for Teams notifications)
CREATE TABLE alert_state (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  entity_type TEXT NOT NULL, -- 'service', 'isp', 'cloud', 'grid'
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
  old_status TEXT,
  new_status TEXT NOT NULL,
  alert_sent INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX idx_status_history_service ON status_history(service_id, checked_at DESC);
CREATE INDEX idx_events_occurred ON events(occurred_at DESC);
CREATE INDEX idx_events_source ON events(source, occurred_at DESC);
CREATE INDEX idx_cloud_status_provider ON cloud_status(provider, checked_at DESC);
CREATE INDEX idx_m365_status_checked ON m365_status(checked_at DESC);
```

---

## 8. API Endpoints

### Service Status
```
GET /api/services
Returns: All services with current status for ticker display

GET /api/services/:id/history?days=7
Returns: Historical status data for charts
```

### Internet/ISP Status
```
GET /api/internet
Returns: Local ISP status + global internet health metrics

GET /api/isp/:id/details
Returns: Detailed metrics for specific ISP
```

### Cloud Status
```
GET /api/cloud
Returns: Combined status for AWS, Azure, GCP

GET /api/cloud/:provider
Returns: Detailed status for specific provider (aws|azure|gcp)
```

### Productivity Suites
```
GET /api/m365
Returns: Full Microsoft 365 service breakdown with active issues

GET /api/gworkspace
Returns: Google Workspace status (basic)
```

### Radar/Attacks
```
GET /api/radar/attacks
Returns: L3/L7 attack data, breakdown by type

GET /api/radar/internet
Returns: Global internet health metrics
```

### Power Grid
```
GET /api/grid
Returns: PJM grid status, demand, generation mix
```

### Events
```
GET /api/events?limit=50&severity=critical,warning
Returns: Unified event timeline with optional filters
```

---

## 9. Cron Schedule

```toml
[triggers]
crons = [
  "* * * * *",        # Every minute - HTTP checks, ISP checks
  "*/5 * * * *",      # Every 5 minutes - Statuspages, Radar, Cloud, Grid
  "*/15 * * * *",     # Every 15 minutes - Radar IQI/Speed metrics
  "0 3 * * *"         # Daily 3 AM - Data cleanup (prune >30 days)
]
```

### Cron Handler Mapping

**Every 1 minute:**
- Internal HTTP checks (ConnectWise Manage, Automate, ScreenConnect)
- ISP HTTP checks (if configured)

**Every 5 minutes:**
- All Statuspage polling (IT Glue, Datto, Proofpoint, Umbrella, Duo, etc.)
- Cloudflare Radar: outages, anomalies, attacks, BGP
- AWS/Azure/GCP status feeds
- Microsoft 365 Graph API
- Google Workspace JSON
- EIA grid data
- PJM data
- Event aggregation
- Alert checking & Teams notifications

**Every 15 minutes:**
- Cloudflare Radar: IQI and Speed metrics (heavier queries)

**Daily 3 AM:**
- Prune status_history older than 30 days
- Prune events older than 30 days
- Prune api_cache expired entries

---

## 10. Alerting System

### Microsoft Teams Webhook Integration

**Webhook URL:** Store as Worker secret `TEAMS_WEBHOOK_URL`

**Alert Triggers:**
1. Service status changes (operational → warning, warning → outage, recovery)
2. ISP traffic anomalies detected
3. BGP incidents (hijacks/leaks) affecting monitored ASNs
4. Cloud provider incidents affecting core services
5. M365 service degradation or outage
6. Power grid enters alert/emergency status

**Alert Logic:**
```javascript
// Only alert on meaningful transitions
const shouldAlert = (oldStatus, newStatus) => {
  // Always alert on outages
  if (newStatus === 'outage') return true;
  // Alert on degradation from operational
  if (oldStatus === 'operational' && newStatus === 'degraded') return true;
  // Alert on recovery
  if ((oldStatus === 'outage' || oldStatus === 'degraded') && newStatus === 'operational') return true;
  return false;
};
```

**Adaptive Card Template (Service Status Change):**
```json
{
  "type": "message",
  "attachments": [{
    "contentType": "application/vnd.microsoft.card.adaptive",
    "content": {
      "type": "AdaptiveCard",
      "$schema": "http://adaptivecards.io/schemas/adaptive-card.json",
      "version": "1.4",
      "body": [
        {
          "type": "Container",
          "style": "attention",
          "items": [
            {
              "type": "TextBlock",
              "text": "🔴 Service Outage Detected",
              "weight": "bolder",
              "size": "medium"
            }
          ]
        },
        {
          "type": "FactSet",
          "facts": [
            { "title": "Service:", "value": "${serviceName}" },
            { "title": "Previous Status:", "value": "${oldStatus}" },
            { "title": "Current Status:", "value": "${newStatus}" },
            { "title": "Time:", "value": "${timestamp}" }
          ]
        }
      ]
    }
  }]
}
```

**Rate Limits:** Teams allows 4 requests/second. Implement exponential backoff.

---

## 11. Project Structure

```
msp-dashboard/
├── wrangler.toml
├── package.json
├── tsconfig.json
├── migrations/
│   └── 0001_initial.sql
├── src/
│   ├── index.ts                 # Main Worker entry point
│   ├── scheduled.ts             # Cron trigger handlers
│   ├── types.ts                 # TypeScript interfaces
│   ├── api/
│   │   ├── routes.ts            # API route definitions
│   │   ├── services.ts          # /api/services handlers
│   │   ├── internet.ts          # /api/internet handlers
│   │   ├── cloud.ts             # /api/cloud handlers
│   │   ├── m365.ts              # /api/m365 handlers
│   │   ├── gworkspace.ts        # /api/gworkspace handlers
│   │   ├── radar.ts             # /api/radar handlers
│   │   ├── grid.ts              # /api/grid handlers
│   │   └── events.ts            # /api/events handlers
│   ├── collectors/
│   │   ├── http-check.ts        # Generic HTTP health check
│   │   ├── statuspage.ts        # Atlassian Statuspage parser
│   │   ├── microsoft.ts         # M365 Graph API collector
│   │   ├── cloud/
│   │   │   ├── aws.ts           # AWS status RSS parser
│   │   │   ├── azure.ts         # Azure status RSS parser
│   │   │   └── gcp.ts           # GCP status JSON parser
│   │   ├── isp/
│   │   │   ├── radar-iqi.ts     # Cloudflare Radar IQI
│   │   │   ├── radar-anomaly.ts # Traffic anomalies
│   │   │   └── radar-bgp.ts     # BGP incidents
│   │   ├── radar/
│   │   │   ├── attacks.ts       # L3/L7 attack data
│   │   │   └── outages.ts       # Global outages
│   │   ├── grid/
│   │   │   ├── eia.ts           # EIA API collector
│   │   │   └── pjm.ts           # PJM API collector
│   │   └── gworkspace.ts        # Google Workspace JSON
│   ├── alerting/
│   │   ├── index.ts             # Alert orchestration
│   │   ├── comparator.ts        # Status change detection
│   │   ├── teams.ts             # Teams webhook client
│   │   └── templates.ts         # Adaptive Card templates
│   └── db/
│       ├── schema.sql           # Full schema (for reference)
│       └── queries.ts           # Common DB queries
└── frontend/
    ├── index.html
    ├── package.json
    ├── tsconfig.json
    ├── vite.config.ts
    └── src/
        ├── main.tsx
        ├── App.tsx
        ├── theme.ts              # Mantine theme config
        ├── api/
        │   └── client.ts         # API fetch utilities
        ├── hooks/
        │   ├── useAutoRefresh.ts # Auto-refresh hook
        │   ├── usePageRotation.ts# Page rotation logic
        │   └── useTickerData.ts  # Ticker data management
        ├── components/
        │   ├── Layout.tsx        # Main layout wrapper
        │   ├── ServiceTicker.tsx # Bottom ticker bar
        │   ├── ServiceCard.tsx   # Individual service card
        │   ├── PageContainer.tsx # Dashboard page wrapper
        │   ├── PageTransition.tsx# Page transition animations
        │   └── StatusIndicator.tsx
        └── pages/
            ├── InternetStatusPage.tsx
            ├── CloudStatusPage.tsx
            ├── M365WorkspacePage.tsx
            ├── RadarAttacksPage.tsx
            ├── PowerGridPage.tsx
            └── EventsPage.tsx
```

---

## 12. Configuration Files

### wrangler.toml
```toml
name = "msp-dashboard"
main = "src/index.ts"
compatibility_date = "2024-01-01"
compatibility_flags = ["nodejs_compat"]

[triggers]
crons = [
  "* * * * *",
  "*/5 * * * *",
  "*/15 * * * *",
  "0 3 * * *"
]

[[d1_databases]]
binding = "DB"
database_name = "msp-dashboard"
database_id = "your-database-id-here"

[site]
bucket = "./frontend/dist"

[vars]
ENVIRONMENT = "production"
ALERTS_ENABLED = "true"

# Set these via: wrangler secret put SECRET_NAME
# Required secrets:
# - CF_RADAR_API_TOKEN
# - MS_GRAPH_TENANT_ID
# - MS_GRAPH_CLIENT_ID
# - MS_GRAPH_CLIENT_SECRET
# - EIA_API_KEY
# - TEAMS_WEBHOOK_URL
# Optional:
# - PJM_API_KEY
```

### package.json (Worker)
```json
{
  "name": "msp-dashboard-worker",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "wrangler dev",
    "deploy": "wrangler deploy",
    "db:migrate": "wrangler d1 execute msp-dashboard --file=./migrations/0001_initial.sql"
  },
  "devDependencies": {
    "@cloudflare/workers-types": "^4.20241127.0",
    "typescript": "^5.3.0",
    "wrangler": "^3.91.0"
  }
}
```

### package.json (Frontend)
```json
{
  "name": "msp-dashboard-frontend",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "@mantine/core": "^7.14.0",
    "@mantine/hooks": "^7.14.0",
    "@tabler/icons-react": "^3.21.0",
    "framer-motion": "^11.11.0",
    "react": "^18.3.0",
    "react-dom": "^18.3.0",
    "recharts": "^2.13.0"
  },
  "devDependencies": {
    "@types/react": "^18.3.0",
    "@types/react-dom": "^18.3.0",
    "@vitejs/plugin-react": "^4.3.0",
    "postcss": "^8.4.0",
    "postcss-preset-mantine": "^1.17.0",
    "typescript": "^5.3.0",
    "vite": "^5.4.0"
  }
}
```

### vite.config.ts
```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
  server: {
    proxy: {
      '/api': 'http://localhost:8787',
    },
  },
});
```

---

## 13. Implementation Phases

### Phase 1: Foundation
- [ ] Initialize project structure
- [ ] Create wrangler.toml
- [ ] Create D1 database and run migrations
- [ ] Seed services table with all 15+ services
- [ ] Basic Worker with health check endpoint

### Phase 2: Service Status Collectors
- [ ] Implement HTTP check collector
- [ ] Implement Atlassian Statuspage parser
- [ ] Implement StatusHub parser (for SonicWall)
- [ ] Wire up cron triggers for service checks
- [ ] Test with real status pages

### Phase 3: Frontend Shell
- [ ] Set up Vite + React + Mantine
- [ ] Configure dark theme with red accent
- [ ] Create Layout component with ticker + page container
- [ ] Implement responsive sizing for 4K

### Phase 4: Service Ticker
- [ ] Create ServiceCard component with full-color backgrounds
- [ ] Create ServiceTicker with smooth scrolling
- [ ] Connect to /api/services
- [ ] Implement 30-second auto-refresh
- [ ] Add pulse animation for outages

### Phase 5: Cloud Status Integration
- [ ] Implement AWS RSS parser
- [ ] Implement Azure RSS parser
- [ ] Implement GCP JSON parser
- [ ] Create /api/cloud endpoint
- [ ] Add cloud services to ticker

### Phase 6: Microsoft 365 Integration
- [ ] Implement Graph API authentication
- [ ] Implement service health collector
- [ ] Create /api/m365 endpoint
- [ ] Add M365 services to ticker

### Phase 7: Google Workspace Integration
- [ ] Implement JSON feed parser
- [ ] Create /api/gworkspace endpoint
- [ ] Add basic Workspace status to ticker

### Phase 8: Dashboard Pages
- [ ] Create page rotation system (45s intervals)
- [ ] Implement InternetStatusPage
- [ ] Implement CloudStatusPage
- [ ] Implement M365WorkspacePage
- [ ] Implement RadarAttacksPage
- [ ] Implement PowerGridPage
- [ ] Implement EventsPage
- [ ] Add page transition animations

### Phase 9: Cloudflare Radar Integration
- [ ] Implement IQI/Speed collectors
- [ ] Implement anomaly/outage collectors
- [ ] Implement BGP incident collectors
- [ ] Implement attack data collectors
- [ ] Wire up to dashboard pages

### Phase 10: Power Grid Integration
- [ ] Implement EIA API collector
- [ ] Implement PJM API collector (optional)
- [ ] Create grid status page visualization

### Phase 11: Events & Alerting
- [ ] Implement event aggregation
- [ ] Create unified events timeline
- [ ] Implement alert state tracking
- [ ] Implement Teams webhook integration
- [ ] Create Adaptive Card templates
- [ ] Test alert delivery

### Phase 12: Polish & Deploy
- [ ] Final styling pass
- [ ] Test on actual 4K TV
- [ ] Performance optimization
- [ ] Deploy to production
- [ ] Document operational procedures

---

## 14. Styling Guidelines

### Theme Configuration
```typescript
// frontend/src/theme.ts
import { createTheme, MantineColorsTuple } from '@mantine/core';

const redAccent: MantineColorsTuple = [
  '#ffe9e9', '#ffd1d1', '#fba0a0', '#f76d6d', '#f44343',
  '#f22828', '#e53935', '#d42a2a', '#be2323', '#a51c1c'
];

export const theme = createTheme({
  primaryColor: 'red',
  colors: {
    red: redAccent,
  },
  defaultRadius: 'md',
  fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
  headings: {
    fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
  },
});
```

### CSS Variables for Responsive 4K
```css
:root {
  --ticker-height: 12vh;
  --card-min-width: 8vw;
  --font-base: 1.2vw;
  --font-lg: 1.8vw;
  --font-xl: 2.4vw;
  --spacing-base: 1vw;
}

@media (max-width: 1920px) {
  :root {
    --font-base: 16px;
    --font-lg: 24px;
    --font-xl: 32px;
  }
}
```

### Status Colors
```css
:root {
  --status-operational: #2f9e44;
  --status-degraded: #fab005;
  --status-outage: #e03131;
  --status-unknown: #495057;
}
```

### Pulse Animation for Outages
```css
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
}

.status-outage {
  animation: pulse 2s ease-in-out infinite;
}
```

### Ticker Scroll Animation
```css
@keyframes scroll {
  0% { transform: translateX(0); }
  100% { transform: translateX(-50%); }
}

.ticker-track {
  animation: scroll 60s linear infinite;
}

.ticker-track:hover {
  animation-play-state: paused;
}
```

---

## 15. Technical Notes

### Cloudflare Workers Limitations
- Cannot do ICMP ping (no raw sockets)
- 50ms CPU time on free tier, 30s on paid
- D1 is SQLite - use appropriate query patterns
- Cron triggers require paid plan for < 1 hour intervals

### Status Determination Logic
```typescript
type Status = 'operational' | 'degraded' | 'outage' | 'unknown';

function determineStatus(statuspageIndicator: string): Status {
  switch (statuspageIndicator) {
    case 'none': return 'operational';
    case 'minor': return 'degraded';
    case 'major':
    case 'critical': return 'outage';
    default: return 'unknown';
  }
}

function determineStatusFromComponents(components: Component[]): Status {
  const hasOutage = components.some(c => 
    c.status === 'major_outage' || c.status === 'partial_outage'
  );
  const hasDegraded = components.some(c => 
    c.status === 'degraded_performance'
  );
  
  if (hasOutage) return 'outage';
  if (hasDegraded) return 'degraded';
  return 'operational';
}
```

### API Response Caching Strategy
- Cache Statuspage responses for 4 minutes (refresh every 5)
- Cache Radar data for 4 minutes
- Cache M365 data for 4 minutes
- Cache Cloud status for 4 minutes
- Use `api_cache` table with `expires_at` field

### Error Handling
- All collectors should catch errors and return `unknown` status
- Log errors to console (viewable in Workers dashboard)
- Never let a single failed API call break the entire dashboard
- Implement retry with exponential backoff for transient failures

### SonicWall StatusHub Note
SonicWall uses StatusHub instead of Atlassian Statuspage. The API format may differ slightly. Check `https://status.sonicwall.com/api/` for available endpoints or fall back to RSS/scraping.

---

## 16. Required Credentials

Before deployment, collect the following:

### Must Have
| Credential | How to Get | Secret Name |
|------------|------------|-------------|
| Cloudflare Radar API Token | Cloudflare Dashboard → API Tokens → Create with "Account.Cloudflare Radar:Read" | `CF_RADAR_API_TOKEN` |
| Microsoft Graph (Tenant ID) | Azure Portal → Azure AD → Overview | `MS_GRAPH_TENANT_ID` |
| Microsoft Graph (Client ID) | Azure Portal → App Registrations → Your App | `MS_GRAPH_CLIENT_ID` |
| Microsoft Graph (Client Secret) | Azure Portal → App Registrations → Certificates & Secrets | `MS_GRAPH_CLIENT_SECRET` |
| EIA API Key | https://www.eia.gov/opendata/ → Register | `EIA_API_KEY` |
| Teams Webhook URL | Teams → Channel → Connectors → Incoming Webhook | `TEAMS_WEBHOOK_URL` |

### Nice to Have
| Credential | How to Get | Secret Name |
|------------|------------|-------------|
| PJM API Key | https://dataminer2.pjm.com/ → Register | `PJM_API_KEY` |

### Internal URLs (Get from your team)
- ConnectWise Manage URL: `_____________________`
- ConnectWise Automate URL: `_____________________`
- ScreenConnect URL: `_____________________`
- Intermedia Elevate Portal: `_____________________`

### Azure AD App Registration Setup
1. Go to Azure Portal → Azure Active Directory → App Registrations
2. New Registration → Name it "MSP Dashboard"
3. Add API Permission: `Microsoft Graph` → `Application permissions` → `ServiceHealth.Read.All`
4. Grant admin consent
5. Create client secret and save it

---

## Quick Start Commands

```bash
# Clone and setup
mkdir msp-dashboard && cd msp-dashboard
npm init -y

# Install wrangler
npm install -D wrangler

# Login to Cloudflare
npx wrangler login

# Create D1 database
npx wrangler d1 create msp-dashboard
# Copy the database_id to wrangler.toml

# Run migrations
npx wrangler d1 execute msp-dashboard --file=./migrations/0001_initial.sql

# Set secrets
npx wrangler secret put CF_RADAR_API_TOKEN
npx wrangler secret put MS_GRAPH_TENANT_ID
npx wrangler secret put MS_GRAPH_CLIENT_ID
npx wrangler secret put MS_GRAPH_CLIENT_SECRET
npx wrangler secret put EIA_API_KEY
npx wrangler secret put TEAMS_WEBHOOK_URL

# Development
npx wrangler dev

# Deploy
npx wrangler deploy
```

---

## Final Notes

This plan provides a comprehensive roadmap for building the MSP status dashboard. The key priorities are:

1. **Start with the ticker** - Get service status displaying first as it's the most visible element
2. **Add data sources incrementally** - Don't try to implement all 6 dashboard pages at once
3. **Test on actual 4K TV early** - Font sizes and layouts may need adjustment
4. **Monitor Cloudflare Radar confidence** - PenTeleData (AS3737) may have limited Radar data coverage as a regional ISP

Good luck! 🚀