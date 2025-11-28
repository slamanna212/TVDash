# Quick Start Guide

## Prerequisites

- Node.js 24 or 25 installed
- Cloudflare account
- Git repository initialized

## Step 1: Update Wrangler

```bash
npm install --save-dev wrangler@4
```

## Step 2: Cloudflare Authentication

Choose one option:

**Option A: Interactive Login**
```bash
npx wrangler login
```

**Option B: API Token**
```bash
export CLOUDFLARE_API_TOKEN=your_token_here
```

Get your API token from: https://dash.cloudflare.com/profile/api-tokens

## Step 3: Create D1 Database

```bash
npx wrangler d1 create msp-dashboard
```

This will output something like:
```
[[d1_databases]]
binding = "DB"
database_name = "msp-dashboard"
database_id = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
```

Copy the `database_id` and update it in `wrangler.toml`:

```toml
[[d1_databases]]
binding = "DB"
database_name = "msp-dashboard"
database_id = "paste-your-database-id-here"  # <-- Update this
```

## Step 4: Run Database Migrations

```bash
npx wrangler d1 migrations apply msp-dashboard
```

This creates all tables and seeds initial data (13 services + 2 ISPs).

## Step 5: Install Frontend Dependencies

```bash
cd frontend
npm install
cd ..
```

## Step 6: Configure Secrets

You'll need to set up API credentials. For now, you can skip this and test with placeholder data.

When ready, configure:

```bash
# Required for full functionality
npx wrangler secret put CF_RADAR_API_TOKEN
npx wrangler secret put M365_TENANT_ID
npx wrangler secret put M365_CLIENT_ID
npx wrangler secret put M365_CLIENT_SECRET
npx wrangler secret put EIA_API_KEY
npx wrangler secret put TEAMS_WEBHOOK_URL

# Optional
npx wrangler secret put PJM_API_KEY
```

## Step 7: Test Locally

### Terminal 1: Run the Worker

```bash
npm run dev
```

Worker will be available at http://localhost:8787

Test endpoints:
- http://localhost:8787/health (should return OK)
- http://localhost:8787/api/services (returns services with 'unknown' status initially)
- http://localhost:8787/api/cloud (fetches AWS, Azure, GCP status - works without secrets!)
- http://localhost:8787/api/gworkspace (fetches Google Workspace status - works without secrets!)

### Terminal 2: Run the Frontend

```bash
cd frontend
npm run dev
```

Frontend will be available at http://localhost:5173

You should see:
- Service ticker at the bottom (will show all services as "unknown" until cron runs)
- Dashboard pages rotating every 45 seconds

## Step 8: Manually Trigger Cron (Optional)

To populate status data without waiting for scheduled runs:

```bash
# Trigger the 5-minute cron task
curl -X POST http://localhost:8787/__scheduled?cron=*/5+*+*+*+*
```

Note: The cron handlers are stubbed out. You'll need to implement them next.

## Step 9: Build Frontend

When ready to deploy:

```bash
cd frontend
npm run build
cd ..
```

Built files go to `frontend/dist/` and will be served by Workers Sites.

## Step 10: Deploy to Production

```bash
npm run deploy
```

This deploys:
- Worker with API routes
- Cron triggers (will run automatically on schedule)
- Static frontend via Workers Sites

## What Works Right Now

✅ Worker can start locally
✅ API endpoints are wired up:
  - `/api/services` - Returns seeded services
  - `/api/cloud` - Fetches live AWS, Azure, GCP status
  - `/api/m365` - Fetches M365 status (requires secrets)
  - `/api/gworkspace` - Fetches Google Workspace status

✅ Frontend can build and run
✅ Service ticker displays and scrolls
✅ Page rotation works (45s intervals)

## What Needs Implementation

🔲 Cron collectors in `src/scheduled.ts`
🔲 Service history endpoint
🔲 Internet/ISP status endpoint
🔲 Radar attack data endpoint
🔲 Power grid endpoint
🔲 Events timeline endpoint
🔲 Dashboard page content (currently placeholders)

## Troubleshooting

### "CLOUDFLARE_API_TOKEN not set"
Set your API token: `export CLOUDFLARE_API_TOKEN=your_token`

### "wrangler: command not found"
Install wrangler: `npm install -D wrangler@4`

### "Database not found"
Make sure you ran `wrangler d1 create` and updated the `database_id` in wrangler.toml

### Frontend shows "Loading services..."
The services endpoint works, but all services are "unknown" until cron collectors populate status data

### "Failed to fetch" errors in frontend
Make sure the Worker is running on port 8787

## Next Steps

1. Implement cron collectors to populate real status data
2. Build out dashboard pages with data visualizations
3. Add Cloudflare Radar integration for ISP monitoring
4. Implement Teams alerting

## Getting API Credentials

### Cloudflare Radar API Token
1. Go to https://dash.cloudflare.com/profile/api-tokens
2. Create Token → Use Template → "Read Cloudflare Radar"
3. Copy the token

### Microsoft 365 (Azure AD)
1. Azure Portal → Azure Active Directory → App Registrations
2. New Registration → Name: "MSP Dashboard"
3. API Permissions → Microsoft Graph → Application → `ServiceHealth.Read.All`
4. Grant Admin Consent
5. Certificates & Secrets → New Client Secret
6. Note: Tenant ID, Application (client) ID, Client Secret

### EIA API Key
1. Visit https://www.eia.gov/opendata/
2. Register for free account
3. Copy API key from dashboard

### Teams Webhook
1. Go to your Teams channel
2. Connectors → Incoming Webhook
3. Configure and copy webhook URL

---

**You're ready to go!** The foundation is complete. Start with Step 1 and work your way through.
