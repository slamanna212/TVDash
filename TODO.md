# MSP Dashboard - TODO List

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
