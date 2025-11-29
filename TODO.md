# MSP Dashboard - TODO List

Last Updated: 2025-11-29

## ✅ Recently Completed
- Database Query Optimization (53% reduction in queries!)
- Historical data recording and API endpoint (fully functional!)
- Proofpoint Community collector (undocumented but working)

## 🎯 High Priority (Start Here)

### ~~0. Database Query Optimization~~ ✅ COMPLETED
**Effort**: 2-3 hours
**Impact**: Reduce queries from 256/15min to ~120/15min (53% reduction, save $0.19/month)
**Current Issue**: 256 queries per 15 minutes = 24,576 queries/day

**Problem Analysis:**
- M365 writes 30-40 duplicate rows every 5 minutes (10,080 rows/day!)
- HTTP checks running every 1 minute (too frequent)
- Cloud/ISP running every 5 minutes (should be 15)

**Phase 1 - Quick Wins (30 minutes):**
- [x] Move HTTP checks from 1-minute to 5-minute interval
  - Edit `wrangler.toml`: Remove `"* * * * *"` cron
  - Edit `src/scheduled.ts`: Remove 1-min block, add `runHttpHealthChecks(env)` to 5-min block
  - Impact: -48 queries per 15 min

- [x] Move Cloud & ISP to 15-minute interval
  - Edit `src/scheduled.ts`: Move `runCloudStatusChecks(env)` and `runISPChecks(env)` from 5-min to 15-min block
  - Keep M365 at 5 minutes (user requirement)
  - Impact: -48 queries per 15 min

**Phase 2 - M365 Deduplication (1-2 hours):**
- [x] Create migration file `migrations/0007_optimize_m365.sql`:
  ```sql
  CREATE TABLE m365_current (
    service_name TEXT PRIMARY KEY,
    status TEXT NOT NULL,
    issues TEXT,
    last_changed TEXT NOT NULL,
    checked_at TEXT NOT NULL
  );

  INSERT OR REPLACE INTO m365_current (service_name, status, issues, last_changed, checked_at)
  SELECT service_name, status, issues, checked_at, checked_at
  FROM m365_health
  WHERE (service_name, checked_at) IN (
    SELECT service_name, MAX(checked_at)
    FROM m365_health
    GROUP BY service_name
  );
  ```

- [x] Update `src/scheduled.ts` - runProductivityChecks function:
  - Replace the for loop with REPLACE logic
  - Check previous status from m365_current
  - Track last_changed timestamp
  - Only INSERT to m365_health on actual status changes
  - Impact: -35 queries per 5-min run during steady state

- [x] Update `src/db/queries.ts` - getLatestM365Health function:
  - Change to query m365_current instead of m365_health
  - Return service_name, status, issues, last_changed, checked_at

- [x] Run migration: `npx wrangler d1 migrations apply drone`

- [x] Test in dev: Verify M365 page shows current data correctly

**✅ COMPLETED! Expected Results:**
- Queries: 256/15min → ~120/15min (53% reduction)
- Storage: m365_health stays at ~35-40 rows (vs 302,400/month)
- Cost: $0.36/month → $0.17/month

### 1. M365 & Cloud Page Enhancements
**Effort**: TBD
**Dependencies**: None

Tasks:
- [ ] Gather requirements from user
- [ ] Enhance CloudStatusPage.tsx
- [ ] Enhance M365WorkspacePage.tsx


### 2. Events Timeline Page
**Effort**: 3-5 hours
**Dependencies**: None (DB helpers already exist!)

Tasks:
- [ ] Wire up `/api/events` endpoint in src/api/routes.ts
- [ ] Implement event aggregation in cron collectors
- [ ] Build EventsPage.tsx frontend with filterable timeline
- [ ] Add real-time event feed

## 📋 Medium Priority

### 3. Power Grid Monitoring
**Effort**: 4-6 hours
**Dependencies**: EIA_API_KEY secret (free from eia.gov)

Tasks:
- [ ] Implement EIA API collector (src/collectors/grid/eia.ts)
- [ ] Wire up `/api/grid` endpoint
- [ ] Build PowerGridPage.tsx with demand/capacity charts
- [ ] Add to cron schedule (every 5 minutes)
- [ ] Show PJM region status, LMP prices, fuel mix

### 4. Teams Alerting System
**Effort**: 4-6 hours
**Dependencies**: TEAMS_WEBHOOK_URL secret

Tasks:
- [ ] Implement alert comparator (src/alerting/comparator.ts)
- [ ] Implement Teams webhook sender (src/alerting/teams.ts)
- [ ] Create Adaptive Card templates (src/alerting/templates.ts)
- [ ] Add alert processing to cron schedule
- [ ] Test webhook delivery and rate limiting

## 🔄 Future Enhancements (Details TBD)

### 5. Uptime Percentage Display
**Effort**: 1-2 hours
**Dependencies**: None (historical data already recording!)

Tasks:
- [ ] Add `calculateUptime()` function to src/utils/status.ts (already exists!)
- [ ] Display uptime % on ServiceCard component
- [ ] Show uptime trend indicator on ticker cards

## ❌ Not Planned

These features have been removed from the roadmap:
- Service history charts (API works, but no UI needed yet)
- Mobile-responsive view
- Enhanced Radar IQI/Speed metrics
- Alert configuration UI

## Quick Reference

**API Endpoints Status:**
- ✅ `/api/services` - All services with current status
- ✅ `/api/services/:id/history` - Historical data (READY!)
- ✅ `/api/cloud` - AWS, Azure, GCP status
- ✅ `/api/m365` - Microsoft 365 health
- ✅ `/api/gworkspace` - Google Workspace status
- ✅ `/api/internet` - ISP status via Radar
- ✅ `/api/radar/attacks` - DDoS attack data
- 🔲 `/api/grid` - Power grid status (TODO)
- 🔲 `/api/events` - Event timeline (TODO)

**Frontend Pages Status:**
- ✅ CloudStatusPage - Fully built
- ✅ M365WorkspacePage - Fully built
- ✅ InternetStatusPage - Fully built
- ✅ RadarAttacksPage - Fully built
- 🔲 PowerGridPage - Placeholder
- 🔲 EventsPage - Placeholder
