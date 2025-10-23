# MSP Status Dashboard - Project Documentation

## Project Overview

A 4K status dashboard for an MSP office that displays internet health metrics, service statuses, and tech trends. The dashboard auto-cycles through multiple pages and updates data in real-time using Cloudflare Workers for data fetching and caching.

**Display Target:** 4K TV (3840×2160)  
**Purpose:** Ambient office display showing internet health and tech metrics  
**Update Frequency:** Auto-cycling pages with live data updates

## Tech Stack

### Frontend
- **Framework:** React 18+ with Vite
- **UI Library:** Mantine UI (for beautiful, ready-made components)
- **Styling:** Mantine's built-in styling + CSS modules
- **State Management:** React hooks (useState, useEffect)
- **Routing:** React Router (for page management)

### Backend/Infrastructure
- **Hosting:** Cloudflare Pages (runs on Workers)
- **API Layer:** Cloudflare Pages Functions (Workers)
- **Caching:** Workers KV (for storing fetched data)
- **Scheduled Tasks:** Cloudflare Cron Triggers (for pre-warming cache)
- **Build Tool:** Vite

## Architecture

```
┌─────────────────────────────────────────────┐
│  React Dashboard (Browser)                  │
│  - Displays data from API                   │
│  - Auto-cycles pages every 30-60s           │
│  - Polls /api/dashboard every 30s           │
└──────────────────┬──────────────────────────┘
                   │ HTTP Request
                   ▼
┌─────────────────────────────────────────────┐
│  Cloudflare Pages Function                  │
│  /functions/api/dashboard.ts                │
│  - Checks Workers KV cache first            │
│  - Returns cached data if fresh             │
│  - Fetches if stale/missing                 │
└──────────────────┬──────────────────────────┘
                   │
         ┌─────────┴─────────┐
         ▼                   ▼
    Workers KV         External APIs
    (Cache layer)      (Cloudflare Radar, etc.)
         ▲                   │
         └───────────────────┘
              Cron Job
              (Updates cache every 5-10min)
```

## Dashboard Pages

### Page 1: Global Internet Health 🌍
**Data Source:** Cloudflare Radar API
- Global internet traffic (% change vs yesterday)
- Active internet outages worldwide
- Top countries by traffic
- Global DDoS activity today

### Page 2: Attack/Threat Landscape 🛡️
**Data Sources:** Cloudflare Radar, GreyNoise, AbuseIPDB
- DDoS attacks today (count & volume)
- Bot traffic percentage
- Top attack vectors
- Malicious domains blocked
- Internet scanner activity

### Page 3: Infrastructure Status 🏗️
**Data Sources:** Service Status APIs
- Major cloud providers (AWS, Azure, GCP)
- CDN providers (Cloudflare, Akamai)
- DNS providers (Cloudflare DNS, Google DNS, Quad9)
- Color-coded health indicators

### Page 4: Internet Metrics 📊
**Data Source:** Cloudflare Radar API
- IPv6 adoption rate (global %)
- HTTPS adoption trend
- DNS-over-HTTPS usage
- HTTP/3 (QUIC) adoption
- BGP routing instability

### Page 5: Tech/Web Trends 📈
**Data Sources:** Cloudflare Radar, GitHub, Hacker News
- Top domains globally
- Trending websites
- GitHub trending repositories
- Browser usage statistics
- Top Hacker News stories

### Page 6: Cybersecurity News 🔐
**Data Sources:** CVE feeds, CISA alerts, Reddit
- New CVEs published today
- CISA security alerts
- Zero-day discoveries
- Top posts from r/netsec
- Security breach notifications


### Page 8: Fun Internet Stats 🎮
**Data Sources:** Various APIs
- Internet users online now
- Websites created today
- Emails sent today
- Google searches today
- Cryptocurrency prices
- ISS current location

## Key Data Sources & APIs

### Primary Data Sources

**Cloudflare Radar API**
- Base URL: `https://api.cloudflare.com/client/v4/radar/`
- Authentication: API Token
- Key Endpoints:
  - `/radar/attacks/layer3/summary` - DDoS attack data
  - `/radar/http/summary` - HTTP traffic trends
  - `/radar/quality/speed/summary` - Internet speed trends
  - `/radar/bgp/hijacks` - BGP routing incidents
  - `/radar/ranking/top` - Top domains

**Service Status Pages**
- AWS: `https://status.aws.amazon.com/` (no official API, scrape or RSS)
- Azure: `https://status.azure.com/en-us/status` (RSS feed)
- GCP: `https://status.cloud.google.com/` (JSON feed)
- Cloudflare: `https://www.cloudflarestatus.com/api/v2/status.json`
- GitHub: `https://www.githubstatus.com/api/v2/status.json`

**Security Data**
- GreyNoise API: `https://api.greynoise.io/v3/`
- AbuseIPDB: `https://api.abuseipdb.com/api/v2/`
- CVE API: `https://cveawg.mitre.org/api/`
- CISA Known Exploited Vulnerabilities: `https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json`

**Tech Trends**
- GitHub Trending: `https://api.github.com/search/repositories`
- Hacker News: `https://hacker-news.firebaseio.com/v0/`
- Reddit: `https://www.reddit.com/r/netsec/top.json`

### Optional/Future Data Sources
- RIPE Atlas API - Internet connectivity measurements
- Shodan API - Internet-connected device search
- Have I Been Pwned API - Data breach statistics
- CoinGecko API - Cryptocurrency prices
- Open-Meteo API - Weather data

## Data Structure

```typescript
interface DashboardData {
  lastUpdated: string; // ISO timestamp
  
  cloudflareRadar: {
    globalTraffic: {
      current: number;
      changeVsYesterday: number;
    };
    outages: {
      count: number;
      affectedCountries: string[];
    };
    attacks: {
      ddosCount: number;
      ddosVolume: string;
      botTrafficPercent: number;
      topAttackVectors: string[];
    };
    adoption: {
      ipv6Percent: number;
      httpsPercent: number;
      http3Percent: number;
    };
    trending: {
      topDomains: string[];
      topCategories: string[];
    };
  };
  
  serviceStatus: {
    name: string;
    provider: string;
    status: 'operational' | 'degraded' | 'outage';
    lastChecked: string;
    incidents?: {
      title: string;
      status: string;
      created: string;
    }[];
  }[];
  
  security: {
    newCVEs: {
      count: number;
      critical: number;
      high: number;
    };
    cisaAlerts: {
      title: string;
      severity: string;
      published: string;
    }[];
    threats: {
      totalScans: number;
      maliciousIPs: number;
      topCountries: string[];
    };
  };
  
  techTrends: {
    githubTrending: {
      name: string;
      description: string;
      stars: number;
      language: string;
    }[];
    hackerNews: {
      title: string;
      url: string;
      score: number;
      comments: number;
    }[];
  };
  
  spaceWeather: {
    solarFlareRisk: 'low' | 'moderate' | 'high';
    geomagneticStorm: 'none' | 'minor' | 'moderate' | 'strong' | 'severe';
    auroraForecast: string;
  };
}
```

## Cron Job Strategy

Different data sources update at different intervals to optimize API usage and cache efficiency:

```typescript
// Cloudflare Workers Cron Triggers

// Every 2 minutes - Critical, fast-changing data
- Cloudflare Radar attack data
- Active outages
- Service status checks (major providers)

// Every 5 minutes - Important operational data
- Internet traffic metrics
- BGP routing data
- Security threat feeds

// Every 15 minutes - Trend data
- Internet adoption metrics (IPv6, HTTPS, HTTP/3)
- Network quality metrics

// Every 30 minutes - News and trends
- GitHub trending repositories
- Hacker News top stories
- Reddit security posts

// Every hour - Slower-changing data
- CVE feeds
- Top domains
- Browser usage stats

// Every 6 hours - Very stable data
- Space weather
- Long-term trend analysis
```

## Development Workflow

### Local Development (Primary)

```bash
# Standard Vite dev server with hot reload
npm run dev

# Opens at http://localhost:5173
# Use mock data for rapid UI development
# Fast iteration, instant updates
```

### Full Stack Local Testing

```bash
# Run Vite + Workers Functions locally
npx wrangler pages dev -- npm run dev

# Emulates full Cloudflare environment:
# - Pages Functions at /api/*
# - Local KV namespace
# - All running on localhost
```

### Mock Data Approach

For rapid development, use mock data in dev mode:

```typescript
// src/lib/api.ts
const USE_MOCK_DATA = import.meta.env.DEV;

export async function fetchDashboardData() {
  if (USE_MOCK_DATA) {
    return mockDashboardData; // Instant, no API calls
  }
  
  const response = await fetch('/api/dashboard');
  return response.json();
}
```

### Preview Deployments

Every git push creates a preview deployment:

```bash
git push origin feature-branch
# Auto-deploys to: https://abc123.my-dashboard.pages.dev
# Full Workers Functions + KV included
# Test on actual 4K TV with preview URL
```

### Production Deployment

```bash
git push origin main
# Auto-deploys to production
# Cron jobs activate automatically
```

## Project Structure

```
my-dashboard/
├── src/
│   ├── components/
│   │   ├── pages/
│   │   │   ├── GlobalHealth.jsx
│   │   │   ├── ThreatLandscape.jsx
│   │   │   ├── ServiceStatus.jsx
│   │   │   ├── InternetMetrics.jsx
│   │   │   ├── TechTrends.jsx
│   │   │   ├── SecurityNews.jsx
│   │   │   ├── SpaceWeather.jsx
│   │   │   └── FunStats.jsx
│   │   ├── layout/
│   │   │   ├── DashboardLayout.jsx
│   │   │   └── PageCycler.jsx
│   │   └── widgets/
│   │       ├── StatusIndicator.jsx
│   │       ├── MetricCard.jsx
│   │       └── TrendChart.jsx
│   ├── lib/
│   │   ├── api.ts              # API fetching logic
│   │   ├── mockData.ts         # Mock data for development
│   │   └── types.ts            # TypeScript types
│   ├── hooks/
│   │   ├── useDashboardData.ts # Data fetching hook
│   │   └── usePageCycler.ts    # Auto-cycling logic
│   ├── App.jsx
│   └── main.jsx
├── functions/
│   └── api/
│       └── dashboard.ts        # Workers Function for API
├── public/
├── wrangler.toml              # Cloudflare configuration
└── package.json
```

## Key Features to Implement

### 1. Auto Page Cycling
- Automatically rotate through pages every 30-60 seconds
- Smooth transitions between pages
- Pause cycling on manual navigation (optional)
- Resume after timeout

### 2. Live Data Updates
- Poll `/api/dashboard` every 30 seconds
- Update data without page reload
- Show "last updated" timestamp
- Visual indicator when updating

### 3. Responsive to 4K
- Optimize for 3840×2160 resolution
- Large, readable fonts from distance
- High contrast for visibility
- Consider viewing distance (10-15 feet)

### 4. Status Indicators
- Clear visual hierarchy (Red/Yellow/Green)
- Large status badges
- Trend indicators (↑↓)
- Animated state changes

### 5. Error Handling
- Graceful degradation if API fails
- Show cached data with warning
- Retry logic for failed requests
- Fallback to mock data in dev

### 6. Performance
- Lazy load page components
- Optimize bundle size
- Efficient re-renders
- Smooth animations (60fps on 4K)

## Configuration

### Environment Variables

```bash
# .env.local (for local development)
VITE_CLOUDFLARE_API_TOKEN=your_token_here
VITE_GITHUB_TOKEN=your_token_here
VITE_GREYNOISE_API_KEY=your_key_here

# In Cloudflare Dashboard (for production)
# Settings > Environment Variables
CLOUDFLARE_API_TOKEN=***
GITHUB_TOKEN=***
GREYNOISE_API_KEY=***
```

### wrangler.toml

```toml
name = "msp-status-dashboard"
compatibility_date = "2024-01-01"

# KV Namespace for caching
[[kv_namespaces]]
binding = "DASHBOARD_CACHE"
id = "your-production-kv-id"
preview_id = "your-preview-kv-id"

# Cron Triggers
[triggers]
crons = [
  "*/2 * * * *",   # Every 2 minutes - critical data
  "*/5 * * * *",   # Every 5 minutes - important data
  "*/15 * * * *",  # Every 15 minutes - trends
  "*/30 * * * *",  # Every 30 minutes - news
  "0 * * * *",     # Every hour - slow data
]
```

## Getting Started

### Initial Setup

```bash
# 1. Create project
npm create cloudflare@latest msp-dashboard -- --framework=react

cd msp-dashboard

# 2. Install dependencies
npm install @mantine/core @mantine/hooks @mantine/charts
npm install react-router-dom

# 3. Start development
npm run dev

# 4. Create KV namespace
npx wrangler kv:namespace create DASHBOARD_CACHE
npx wrangler kv:namespace create DASHBOARD_CACHE --preview
```

### Development Phases

**Phase 1: UI Foundation**
- Set up Mantine theme
- Create page components
- Build auto-cycling logic
- Style for 4K display
- Use mock data throughout

**Phase 2: API Integration**
- Create Workers Function (`functions/api/dashboard.ts`)
- Implement Cloudflare Radar API calls
- Set up KV caching
- Test with preview deployments

**Phase 3: Additional Data Sources**
- Add service status checks
- Integrate security feeds
- Add GitHub/HN trending
- Implement space weather

**Phase 4: Polish & Deploy**
- Optimize performance
- Add error handling
- Set up cron triggers
- Deploy to production
- Configure TV display

## Testing on 4K TV

### Browser Setup
- Use kiosk mode / fullscreen
- Disable sleep/screensaver
- Auto-launch on boot
- Consider: Chrome in kiosk mode

### Recommended TV Settings
- Enable "PC Mode" or "Game Mode" for 1:1 pixel mapping
- Disable motion smoothing
- Adjust brightness for office lighting
- Consider anti-glare screen protector

## Future Enhancements

- [ ] Add sound alerts for critical events
- [ ] Implement dark/light theme toggle
- [ ] Add manual page navigation controls
- [ ] Weather overlay for office locations
- [ ] Company-specific metrics integration
- [ ] Historical trend graphs
- [ ] Mobile companion app for control
- [ ] Voice announcements for critical alerts
- [ ] Integration with office IoT (lights, etc.)
- [ ] AI-generated insights/summaries

## Useful Links

- [Cloudflare Radar API Docs](https://developers.cloudflare.com/api/operations/radar-get-attacks-layer3-summary)
- [Cloudflare Pages Docs](https://developers.cloudflare.com/pages/)
- [Mantine UI Components](https://mantine.dev/)
- [Vite Documentation](https://vitejs.dev/)
- [Wrangler CLI Docs](https://developers.cloudflare.com/workers/wrangler/)

## Notes

- This dashboard is designed for internal office use, not public-facing
- API keys should be stored in Cloudflare environment variables, never in code
- Consider rate limits when adding new data sources
- Test thoroughly on actual 4K TV before final deployment
- Keep the UI simple and scannable from distance

---

**Project maintained by:** [Your Team/Name]  
**Last updated:** [Date]  
**Claude Code Compatible:** Yes ✓
