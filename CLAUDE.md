# MSP Status Dashboard - Project Context

## Project Overview

A real-time status dashboard designed to be displayed on a 4K TV in an MSP office, running 24/7. Monitors the health of MSP tools, cloud providers, productivity suites, local ISPs, and internet threats.

**Key Goal:** Provide at-a-glance visibility of service health across the entire MSP technology stack.

## Architecture

```
External APIs → Cloudflare Workers (Cron Collectors) → D1 Database → API Routes → React Frontend → 4K TV Display
```

**Stack:**
- **Runtime:** Cloudflare Workers (Paid plan - required for cron triggers)
- **Database:** Cloudflare D1 (SQLite)
- **Backend:** TypeScript + Cloudflare Workers API
- **Frontend:** Vite + React 18 + Mantine UI v7
- **Node:** v24 or v25

## What We Monitor (All Public URLs)

### MSP Tools (13 Services)
All monitored via public status pages:

| Service | Type |
|---------|------|
| IT Glue | Statuspage |
| Datto | Statuspage |
| Proofpoint | Statuspage + Custom |
| Cisco Umbrella | Statuspage |
| Duo | Statuspage |
| SonicWall | StatusHub |
| Huntress | Statuspage |
| CrowdStrike | Statuspage |
| Microsoft 365 | Graph API |
| Google Workspace | JSON API |

**Note on Proofpoint:** Uses a custom collector (src/collectors/proofpoint-community.ts) that handles both proofpointstatus.com and statusgator.com style pages with fallback to standard Statuspage format.

**Note:** ConnectWise Manage, Automate, and ScreenConnect have been REMOVED from this implementation as we only monitor public status pages. The database migration includes them but they are not actively checked.

### Cloud Providers (3 Services)
- **AWS:** RSS feeds (https://status.aws.amazon.com/rss/)
- **Azure:** RSS feed (https://azure.status.microsoft/en-us/status/feed/)
- **Google Cloud:** JSON API (https://status.cloud.google.com/incidents.json)

### Local ISPs (2 Providers)
Monitored via Cloudflare Radar API:
- **Comcast:** AS7922
- **PenTeleData:** AS3737, AS6128

### Additional Monitoring
- **Cloudflare Radar:** DDoS attack data, BGP incidents, traffic anomalies
- **Events:** Unified timeline of all incidents

## Visual Layout

```
┌─────────────────────────────────────────────────────┐
│                                                     │
│          ROTATING DASHBOARD PAGES (88%)            │
│              45-second rotation                     │
│                                                     │
├─────────────────────────────────────────────────────┤
│  SERVICE STATUS TICKER (12%)  [scrolling]          │
│  [IT Glue ✓] [Datto ✓] [M365 ⚠] [AWS ✓] ...       │
└─────────────────────────────────────────────────────┘
```

## Project Structure

```
/
├── src/                          # Worker backend
│   ├── index.ts                  # Main entry point
│   ├── scheduled.ts              # Cron handlers (FULLY IMPLEMENTED)
│   ├── types.ts                  # TypeScript types
│   ├── api/                      # API route handlers
│   │   ├── routes.ts             # Router
│   │   ├── services.ts           # ✅ Service status
│   │   ├── cloud.ts              # ✅ Cloud providers
│   │   ├── m365.ts               # ✅ Microsoft 365
│   │   ├── gworkspace.ts         # ✅ Google Workspace
│   │   ├── internet.ts           # ✅ ISP status
│   │   └── radar.ts              # ✅ Attack data
│   ├── collectors/               # Data collectors (ALL IMPLEMENTED)
│   │   ├── http-check.ts         # Generic HTTP health check
│   │   ├── statuspage.ts         # Atlassian Statuspage parser
│   │   ├── statushub.ts          # StatusHub parser (SonicWall)
│   │   ├── rss-parser.ts         # RSS feed parser
│   │   ├── cloud/                # Cloud provider collectors
│   │   │   ├── aws.ts            # ✅ AWS RSS feeds
│   │   │   ├── azure.ts          # ✅ Azure RSS feed
│   │   │   └── gcp.ts            # ✅ GCP JSON API
│   │   ├── productivity/         # Productivity suite collectors
│   │   │   ├── microsoft.ts      # ✅ M365 Graph API (OAuth)
│   │   │   └── gworkspace.ts     # ✅ Google Workspace JSON
│   │   ├── isp/                  # ISP monitoring
│   │   │   └── radar-isp.ts      # ✅ Cloudflare Radar ISP checks
│   │   └── radar/                # Radar data
│   │       └── attacks.ts        # ✅ DDoS attack data
│   ├── utils/                    # Utilities (ALL IMPLEMENTED)
│   │   ├── cache.ts              # API response caching
│   │   ├── status.ts             # Status helpers
│   │   ├── time.ts               # Time formatting
│   │   └── errors.ts             # Error handling
│   └── db/                       # Database
│       └── queries.ts            # Query helpers
├── frontend/                     # React frontend
│   └── src/
│       ├── main.tsx              # Entry point
│       ├── App.tsx               # Root component
│       ├── theme.ts              # Mantine dark theme
│       ├── components/
│       │   ├── Layout.tsx        # Main layout
│       │   ├── ServiceTicker.tsx # Bottom ticker
│       │   ├── ServiceCard.tsx   # Status cards
│       │   ├── PageContainer.tsx # Page rotation
│       │   └── StatusBadge.tsx   # Status indicator
│       ├── pages/
│       │   ├── InternetStatusPage.tsx    # Placeholder
│       │   ├── CloudStatusPage.tsx       # ✅ FULLY BUILT
│       │   ├── M365WorkspacePage.tsx     # ✅ FULLY BUILT
│       │   ├── RadarAttacksPage.tsx      # Placeholder
│       │   └── EventsPage.tsx            # Placeholder
│       ├── hooks/
│       │   ├── usePageRotation.ts        # Page rotation logic
│       │   └── useAutoRefresh.ts         # Auto-refresh data
│       └── api/
│           └── client.ts                 # API client
├── migrations/
│   └── 0001_initial.sql          # Database schema + seed data
└── .vscode/
    └── tasks.json                # 30+ VS Code tasks

```

## Database Schema (12 Tables)

**Core Tables:**
- `services` - MSP tools and productivity suites (13 seeded)
- `status_history` - Service check results over time
- `local_isps` - ISP definitions (Comcast, PenTeleData)
- `isp_check_history` - ISP metrics from Cloudflare Radar
- `cloud_status` - Cloud provider status snapshots
- `m365_health` - M365 service health
- `gworkspace_status` - Google Workspace status
- `api_cache` - Response caching with TTL
- `events` - Unified incident timeline
- `alert_state` - Alert tracking for Teams notifications
- `alert_history` - Alert audit log

## Cron Schedule (Fully Implemented)

```javascript
// Every minute - HTTP health checks
// Currently NO-OP since we removed internal URLs
'* * * * *'

// Every 5 minutes - External service checks
// - Statuspage polling (IT Glue, Datto, Proofpoint, etc.)
// - Cloud status (AWS, Azure, GCP)
// - M365 Graph API
// - Google Workspace
'*/5 * * * *'

// Every 15 minutes - Radar IQI/Speed metrics (planned)
'*/15 * * * *'

// Daily 3 AM - Data cleanup (>30 days)
'0 3 * * *'
```

## API Endpoints

| Endpoint | Status | Description |
|----------|--------|-------------|
| `GET /health` | ✅ | Health check |
| `GET /api/services` | ✅ | All services with current status |
| `GET /api/cloud` | ✅ | AWS, Azure, GCP combined status |
| `GET /api/m365` | ✅ | Microsoft 365 health |
| `GET /api/gworkspace` | ✅ | Google Workspace status |
| `GET /api/internet` | ✅ | ISP status via Radar |
| `GET /api/radar/attacks` | ✅ | DDoS attack data |
| `GET /api/services/:id/history` | ✅ | Historical data with configurable date range |
| `GET /api/events` | 🔲 | Event timeline (TODO) |

## Required Secrets

**Set via:** `npx wrangler secret put SECRET_NAME`

### Required for Full Functionality:
- `CF_RADAR_API_TOKEN` - Cloudflare Radar API (free)
  - Get from: Cloudflare Dashboard → API Tokens
  - Permission: "Account.Cloudflare Radar:Read"

### Optional (Enable Additional Features):
- `M365_TENANT_ID` - Azure AD Tenant ID
- `M365_CLIENT_ID` - Azure AD App Client ID
- `M365_CLIENT_SECRET` - Azure AD App Secret
  - Setup: Azure Portal → App Registrations → New App
  - Permission: `ServiceHealth.Read.All` (Application)
  - Grant admin consent

- `TEAMS_WEBHOOK_URL` - For alerts (planned)

## Key Features Implemented

### Collectors
✅ **HTTP Check** - Generic health checker with timeout
✅ **Statuspage Parser** - Atlassian Statuspage format
✅ **StatusHub Parser** - SonicWall format
✅ **RSS Parser** - AWS, Azure feeds
✅ **Cloud Collectors** - AWS (6 services), Azure, GCP
✅ **M365 Collector** - OAuth + Graph API
✅ **Workspace Collector** - Public JSON API
✅ **ISP Collector** - Radar IQI, anomalies, BGP
✅ **Attack Collector** - Layer 3/7 DDoS data

### Utilities
✅ **Caching** - D1-backed with TTL
✅ **Status Helpers** - Priority, severity, uptime calc
✅ **Time Formatting** - Relative time, durations
✅ **Error Handling** - Custom errors, retry, timeout
✅ **DB Queries** - 10+ helper functions

### Frontend
✅ **Service Ticker** - Infinite scroll, auto-refresh
✅ **Page Rotation** - 45-second cycles
✅ **Cloud Page** - Live AWS/Azure/GCP data
✅ **M365 Page** - M365 + Workspace split view
✅ **Dark Theme** - Red accent (#e53935)
✅ **4K Optimized** - Responsive vw/vh units

## Development Workflow

### Initial Setup:
```bash
# Install dependencies
npm install
cd frontend && npm install && cd ..

# Update Wrangler
npm install --save-dev wrangler@4

# Login to Cloudflare
npx wrangler login

# Create D1 database
npx wrangler d1 create msp-dashboard
# Copy database_id to wrangler.toml

# Run migrations
npx wrangler d1 migrations apply msp-dashboard

# Set secrets
npx wrangler secret put CF_RADAR_API_TOKEN
# ... other secrets as needed
```

### Local Development:
```bash
# Terminal 1: Worker
npm run dev

# Terminal 2: Frontend
cd frontend && npm run dev
```

### Testing:
```bash
# Test endpoints
curl http://localhost:8787/health | jq
curl http://localhost:8787/api/services | jq
curl http://localhost:8787/api/cloud | jq

# Manually trigger cron
curl -X POST http://localhost:8787/__scheduled?cron=*/5+*+*+*+*
```

### Deployment:
```bash
# Build frontend
cd frontend && npm run build && cd ..

# Deploy everything
npm run deploy
```

## Important Implementation Notes

### NO Internal URLs
- All services monitored via PUBLIC status pages only
- ConnectWise, Automate, ScreenConnect entries exist in DB but are NOT checked
- If you need internal monitoring, implement it separately

### Caching Strategy
- Statuspage responses: 4 minutes (refresh every 5)
- Cloud status: 5 minutes
- M365 data: 5 minutes
- Radar data: 5 minutes
- OAuth tokens: Cached until near expiry

### Error Handling
- All collectors return graceful fallbacks
- Unknown status on API failures
- Detailed console logging
- No exposed stack traces to frontend

### Status Determination
```
operational - Service is working normally
degraded   - Service has performance issues
outage     - Service is down or unavailable
unknown    - Cannot determine status (API error, not configured)
```

### Ticker Behavior
- Auto-refresh every 30 seconds
- Infinite seamless scroll
- Full-color cards (green/yellow/red/gray)
- Pulse animation on outages

### Page Rotation
- 5 pages total
- 45 seconds per page
- Automatic cycling
- No manual navigation (designed for unattended display)

## Common Tasks

### Add a New Service:
1. Add to `migrations/0001_initial.sql` (or create new migration)
2. No code changes needed - cron will auto-detect

### Add a New Collector:
1. Create collector in `src/collectors/`
2. Import in `src/scheduled.ts`
3. Call in appropriate cron interval
4. Add API endpoint in `src/api/`
5. Wire up in `src/api/routes.ts`

### Add a New Dashboard Page:
1. Create page in `frontend/src/pages/`
2. Add to pages array in `PageContainer.tsx`
3. Implement with Mantine components
4. Use `useAutoRefresh` hook for data

### Debugging Cron Tasks:
1. Check Worker logs: `npx wrangler tail`
2. Manually trigger: `curl -X POST http://localhost:8787/__scheduled?cron=*/5+*+*+*+*`
3. Check console output for errors
4. Verify D1 data: `npx wrangler d1 execute msp-dashboard --command="SELECT * FROM status_history LIMIT 10"`

## Performance Considerations

- Collectors run in parallel where possible
- D1 queries use prepared statements
- API responses cached appropriately
- Frontend uses React.memo where beneficial
- Minimal re-renders with proper dependency arrays
- Lighthouse score target: 90+ on all metrics

## Security Checklist

✅ No secrets in code
✅ All secrets via Wrangler
✅ Safe error messages
✅ Input validation in parsers
✅ Timeout protection
✅ CORS headers configured
✅ SQL injection protection (prepared statements)
✅ No PII collected

## Troubleshooting

### "Services showing as 'unknown'"
- Cron hasn't run yet, or
- D1 database not set up, or
- API credentials not configured

### "M365 not working"
- Check Azure AD app setup
- Verify permissions granted
- Check tenant/client IDs are correct
- Look for token errors in logs

### "Radar data empty"
- Verify CF_RADAR_API_TOKEN is set
- Check token has correct permissions
- ASNs may have limited Radar coverage

### "Frontend won't build"
- Check Node version (need 24+)
- Run `npm install` in frontend/
- Check for TypeScript errors

## Testing Strategy

**Manual Testing:**
- Run Worker locally
- Test each API endpoint
- Verify cron triggers work
- Check frontend displays correctly
- Test on actual 4K display

**Integration Testing:**
- Deploy to Cloudflare
- Wait for cron to run
- Verify data in D1
- Check frontend updates

**4K Display Testing:**
- Test at 3840x2160 resolution
- Verify font sizes readable from distance
- Check ticker scroll is smooth
- Ensure page transitions work
- Verify colors on OLED (burn-in concerns)

## Future Enhancements

**Planned:**
- [ ] Teams alerting on status changes
- [ ] Events timeline page
- [ ] Uptime percentage display on service cards
- [ ] M365 & Cloud status page enhancements (details TBD)

**Not Currently Planned:**
- Service history charts (API exists but no UI for now)
- Mobile-responsive view
- Enhanced Radar IQI/Speed metrics
- Alert configuration UI

**See TODO.md for detailed implementation tasks.**

## References

- **Cloudflare Workers:** https://developers.cloudflare.com/workers/
- **Cloudflare D1:** https://developers.cloudflare.com/d1/
- **Mantine UI:** https://mantine.dev/
- **Cloudflare Radar API:** https://developers.cloudflare.com/radar/
- **Microsoft Graph:** https://learn.microsoft.com/en-us/graph/
- **Statuspage API:** https://developer.statuspage.io/

## Project Status

**Current Phase:** MVP Complete - Ready for deployment
**Completion:** ~70% of planned features
**Production Ready:** Yes (once D1 is set up)
**Last Updated:** 2025-11-27

---

## Quick Command Reference

```bash
# Development
npm run dev                              # Start Worker
cd frontend && npm run dev              # Start frontend

# Deployment
npm run deploy                          # Deploy to production

# Database
npx wrangler d1 create msp-dashboard   # Create database
npx wrangler d1 migrations apply       # Run migrations
npx wrangler d1 execute msp-dashboard --command="SELECT * FROM services"

# Secrets
npx wrangler secret put CF_RADAR_API_TOKEN
npx wrangler secret put M365_TENANT_ID

# Debugging
npx wrangler tail                       # View logs
curl -X POST http://localhost:8787/__scheduled?cron=*/5+*+*+*+*  # Trigger cron
```

---

**Note:** This is a monitoring dashboard - it does NOT control services, only observes their public status pages.
