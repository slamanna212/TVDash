# MSP Status Dashboard

A real-time status dashboard for MSP tools, cloud providers, and infrastructure monitoring. Built with Cloudflare Workers, D1 Database, and React.

## Project Status

**Phase 1-5: COMPLETED** ✅
- Project structure initialized
- Database schema created
- Worker backend implemented with API routes
- All collectors implemented:
  - HTTP health checks
  - Atlassian Statuspage parser
  - RSS feed parser (AWS, Azure)
  - StatusHub parser (SonicWall)
  - Cloud collectors (AWS, Azure, GCP)
  - Microsoft 365 Graph API collector
  - Google Workspace collector
- React frontend with Mantine UI
- Service ticker component
- Page rotation system
- Placeholder dashboard pages

## Architecture

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

## Setup Instructions

### 1. Prerequisites

- Node.js 24 or 25
- Cloudflare account
- Cloudflare API token

### 2. Install Dependencies

```bash
# Install Worker dependencies
npm install

# Install Frontend dependencies
cd frontend
npm install
cd ..
```

### 3. Update Wrangler

The current wrangler version is outdated. Update it:

```bash
npm install --save-dev wrangler@4
```

### 4. Cloudflare Setup

#### Login to Cloudflare

```bash
npx wrangler login
```

Or set API token:

```bash
export CLOUDFLARE_API_TOKEN=your_token_here
```

#### Create D1 Database

```bash
npx wrangler d1 create msp-dashboard
```

Copy the `database_id` from the output and update it in `wrangler.toml`:

```toml
[[d1_databases]]
binding = "DB"
database_name = "msp-dashboard"
database_id = "your-database-id-here"  # Replace this
```

#### Run Migrations

```bash
npx wrangler d1 migrations apply msp-dashboard
```

This will create all tables and seed initial services.

### 5. Configure Secrets

Set up the required API credentials:

```bash
# Required
npx wrangler secret put CF_RADAR_API_TOKEN
npx wrangler secret put M365_TENANT_ID
npx wrangler secret put M365_CLIENT_ID
npx wrangler secret put M365_CLIENT_SECRET
npx wrangler secret put EIA_API_KEY
npx wrangler secret put TEAMS_WEBHOOK_URL

# Optional
npx wrangler secret put PJM_API_KEY
```

#### Where to Get Credentials

**Cloudflare Radar API Token:**
- Cloudflare Dashboard → API Tokens → Create Token
- Permission: `Account.Cloudflare Radar:Read`

**Microsoft Graph (M365):**
1. Azure Portal → Azure AD → App Registrations
2. New Registration → Name: "MSP Dashboard"
3. API Permissions → Microsoft Graph → Application → `ServiceHealth.Read.All`
4. Grant admin consent
5. Create client secret
6. Note: Tenant ID, Client ID, Client Secret

**EIA API Key:**
- Register at https://www.eia.gov/opendata/

**Teams Webhook:**
- Teams → Channel → Connectors → Incoming Webhook

### 6. Development

#### Run Worker Locally

```bash
npm run dev
```

The Worker will be available at http://localhost:8787

#### Run Frontend Locally

```bash
cd frontend
npm run dev
```

The frontend will be available at http://localhost:5173 (with API proxied to Worker)

### 7. Build Frontend

```bash
cd frontend
npm run build
cd ..
```

The built files will be in `frontend/dist/` and served by Workers Sites.

### 8. Deploy to Production

```bash
npm run deploy
```

## Project Structure

```
msp-dashboard/
├── wrangler.toml              # Cloudflare Workers config
├── package.json               # Worker dependencies
├── tsconfig.json              # TypeScript config
├── migrations/                # D1 database migrations
│   └── 0001_initial.sql       # Initial schema + seed data
├── src/                       # Worker source code
│   ├── index.ts               # Main Worker entry
│   ├── scheduled.ts           # Cron handlers
│   ├── types.ts               # TypeScript types
│   ├── api/                   # API route handlers
│   │   ├── routes.ts
│   │   └── services.ts
│   ├── collectors/            # Data collectors
│   │   ├── http-check.ts
│   │   ├── statuspage.ts
│   │   ├── statushub.ts
│   │   ├── rss-parser.ts
│   │   ├── cloud/             # AWS, Azure, GCP
│   │   └── productivity/      # M365, Google Workspace
│   └── utils/
│       └── cache.ts
└── frontend/                  # React frontend
    ├── package.json
    ├── vite.config.ts
    ├── index.html
    └── src/
        ├── main.tsx
        ├── App.tsx
        ├── theme.ts           # Mantine theme
        ├── components/
        │   ├── Layout.tsx
        │   ├── ServiceTicker.tsx
        │   ├── ServiceCard.tsx
        │   └── PageContainer.tsx
        ├── hooks/
        │   └── usePageRotation.ts
        └── pages/             # Dashboard pages (placeholders)
            ├── InternetStatusPage.tsx
            ├── CloudStatusPage.tsx
            ├── M365WorkspacePage.tsx
            ├── RadarAttacksPage.tsx
            ├── PowerGridPage.tsx
            └── EventsPage.tsx
```

## Monitored Services

### MSP Tools (13 services)
- ConnectWise Manage, Automate, ScreenConnect (HTTP checks)
- IT Glue, Datto, Proofpoint, Cisco Umbrella, Duo, Huntress, CrowdStrike (Statuspage)
- SonicWall (StatusHub)
- Microsoft 365 (Graph API)
- Google Workspace (JSON feed)

### Cloud Providers
- AWS (RSS feeds)
- Azure (RSS feed)
- Google Cloud (JSON feed)

### Local ISPs (Cloudflare Radar)
- Comcast (AS7922)
- PenTeleData (AS3737, AS6128)

### Future Additions
- Power grid status (EIA API, PJM)
- DDoS attack data (Cloudflare Radar)
- BGP incidents (Cloudflare Radar)
- Unified events timeline

## API Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /api/services` | All services with current status |
| `GET /api/services/:id/history` | Historical data (TODO) |
| `GET /api/internet` | ISP status (TODO) |
| `GET /api/cloud` | Cloud provider status (TODO) |
| `GET /api/m365` | M365 health (TODO) |
| `GET /api/gworkspace` | Google Workspace status (TODO) |
| `GET /api/radar/attacks` | Attack data (TODO) |
| `GET /api/grid` | Power grid status (TODO) |
| `GET /api/events` | Event timeline (TODO) |

## Next Steps

### Immediate (Required for Basic Functionality)
1. ✅ Install dependencies and set up Cloudflare
2. ✅ Create D1 database and run migrations
3. 🔲 Implement cron collectors to populate status data
4. 🔲 Wire up remaining API endpoints
5. 🔲 Test ticker with live data

### Short-term (Enhanced Dashboard)
1. Build out dashboard page components with real data
2. Implement Cloudflare Radar integration
3. Implement Power Grid monitoring
4. Create unified events timeline

### Long-term (Production Ready)
1. Implement Teams alerting system
2. Add error handling and fallbacks
3. Optimize for 4K display
4. Performance testing
5. Production deployment

## Cron Schedule

```
* * * * *        # Every minute - HTTP checks
*/5 * * * *      # Every 5 minutes - Statuspage, Cloud, M365, Workspace
*/15 * * * *     # Every 15 minutes - Radar IQI/Speed
0 3 * * *        # Daily 3 AM - Data cleanup
```

## Development Notes

- Uses Cloudflare Workers paid plan (required for cron triggers)
- D1 database for caching and history
- Dark theme with red accent (#e53935)
- Page rotation every 45 seconds
- Ticker auto-refresh every 30 seconds
- Designed for 4K TV display (responsive vw/vh units)

## License

Private project for internal MSP use.
