import type { Env, Service, CheckResult, ServiceStatus } from './types';
import { performHttpCheck } from './collectors/http-check';
import { checkStatuspageStatusWithGroups } from './collectors/statuspage';
import { checkStatusHubStatus } from './collectors/statushub';
import { checkProofpointCommunityStatus } from './collectors/proofpoint-community';
import { collectAWSStatus } from './collectors/cloud/aws';
import { collectAzureStatus } from './collectors/cloud/azure';
import { collectGCPStatus } from './collectors/cloud/gcp';
import { collectM365Status } from './collectors/productivity/microsoft';
import { checkAllISPs } from './collectors/isp/radar-isp';
import { checkAndCreateAttackEvents } from './collectors/radar/attacks';
import { collectRansomwareData } from './collectors/ransomware/processor';
import { collectCisaKevData } from './collectors/cisa-kev';
import {
  createEventIfChanged,
  getAlertState,
  updateAlertState,
  hashIncident,
} from './utils/events';
import { createEvent, getPreviousCloudIncidents, getPreviousM365Issues } from './db/queries';
import { EVENT_TYPES } from './config/events';

export async function handleScheduled(
  event: ScheduledEvent,
  env: Env,
  _ctx: ExecutionContext
): Promise<void> {
  const cron = event.cron;
  console.log(`Cron triggered: ${cron} at ${new Date(event.scheduledTime).toISOString()}`);

  try {
    // Every 10 minute tasks (changed from 5 to reduce database load)
    if (cron === '*/10 * * * *') {
      console.log('Running 10-minute tasks');
      await Promise.all([
        runHttpHealthChecks(env),
        runStatuspageChecks(env),
        runCustomChecks(env),
        runProductivityChecks(env),
        collectRansomwareData(env),
      ]);
    }

    // Every 15 minute tasks
    if (cron === '*/15 * * * *') {
      console.log('Running 15-minute tasks');
      await Promise.all([
        runCloudStatusChecks(env),
        runISPChecks(env),
        checkAndCreateAttackEvents(env),
      ]);
    }

    // Every 4 hours - CISA KEV catalog
    if (cron === '0 */4 * * *') {
      console.log('Running 4-hour tasks');
      await collectCisaKevData(env);
    }

    // Daily cleanup
    if (cron === '0 3 * * *') {
      console.log('Running daily cleanup');
      await cleanupOldData(env);
    }
  } catch (error) {
    console.error('Error in scheduled task:', error);
  }
}

/**
 * Check HTTP-based services (ConnectWise, ScreenConnect, etc.)
 */
async function runHttpHealthChecks(env: Env): Promise<void> {
  try {
    // Get all services with check_type = 'http' that are not handled by GitHub Actions
    const result = await env.DB.prepare(`
      SELECT * FROM services
      WHERE check_type = 'http'
        AND check_url IS NOT NULL
        AND (check_method IS NULL OR check_method = 'worker')
    `).all();

    if (!result.success || !result.results) {
      console.error('Failed to fetch HTTP services');
      return;
    }

    const services = result.results as Service[];

    // If no services to check, skip (all delegated to GitHub Actions)
    if (services.length === 0) {
      console.log('No HTTP services to check via Worker (all delegated to GitHub Actions)');
      return;
    }

    // Check each service
    for (const service of services) {
      try {
        const checkResult = await performHttpCheck(service.check_url!);
        await recordStatusHistory(env, service.id, checkResult);
        console.log(`✓ ${service.name}: ${checkResult.status}`);
      } catch (error) {
        console.error(`✗ ${service.name}:`, error);
        await recordStatusHistory(env, service.id, {
          status: 'unknown',
          message: 'Check failed',
        });
      }
    }
  } catch (error) {
    console.error('Error in HTTP health checks:', error);
  }
}

/**
 * Check Statuspage-based services (IT Glue, Datto, etc.)
 */
async function runStatuspageChecks(env: Env): Promise<void> {
  try {
    // Get all services with check_type = 'statuspage'
    const result = await env.DB.prepare(`
      SELECT * FROM services WHERE check_type = 'statuspage' AND statuspage_id IS NOT NULL
    `).all();

    if (!result.success || !result.results) {
      console.error('Failed to fetch Statuspage services');
      return;
    }

    const services = result.results as Service[];

    // Check each service
    for (const service of services) {
      try {
        // Determine parser based on URL
        let checkResult: CheckResult;

        if (service.statuspage_id!.includes('sonicwall')) {
          // Use StatusHub parser for SonicWall
          checkResult = await checkStatusHubStatus(service.statuspage_id!);
        } else {
          // Parse component groups if present
          let componentGroups: string[] | null = null;
          if (service.component_groups) {
            try {
              componentGroups = JSON.parse(service.component_groups);
            } catch (e) {
              console.error(`Failed to parse component_groups for ${service.name}:`, e);
            }
          }

          // Use standard Statuspage parser with optional group filtering
          checkResult = await checkStatuspageStatusWithGroups(
            service.statuspage_id!,
            componentGroups
          );
        }

        await recordStatusHistory(env, service.id, checkResult);
        console.log(`✓ ${service.name}: ${checkResult.status}`);
      } catch (error) {
        console.error(`✗ ${service.name}:`, error);
        await recordStatusHistory(env, service.id, {
          status: 'unknown',
          message: 'Check failed',
        });
      }
    }
  } catch (error) {
    console.error('Error in Statuspage checks:', error);
  }
}

/**
 * Check custom status pages (StatusGator-based pages, etc.)
 */
async function runCustomChecks(env: Env): Promise<void> {
  try {
    // Get all services with check_type = 'custom'
    const result = await env.DB.prepare(`
      SELECT * FROM services WHERE check_type = 'custom' AND statuspage_id IS NOT NULL
    `).all();

    if (!result.success || !result.results) {
      console.error('Failed to fetch custom services');
      return;
    }

    const services = result.results as Service[];

    // Check each service
    for (const service of services) {
      try {
        let checkResult: CheckResult;

        // Route to appropriate custom parser based on service name or URL
        if (
          service.name === 'Proofpoint' ||
          service.name === 'CrowdStrike' ||
          service.statuspage_id!.includes('proofpoint') ||
          service.statuspage_id!.includes('statusgator')
        ) {
          checkResult = await checkProofpointCommunityStatus(service.statuspage_id!);
        } else {
          // Default to HTTP check for unknown custom services
          checkResult = {
            status: 'unknown',
            message: 'No custom parser available',
          };
        }

        await recordStatusHistory(env, service.id, checkResult);
        console.log(`✓ ${service.name}: ${checkResult.status}`);
      } catch (error) {
        console.error(`✗ ${service.name}:`, error);
        await recordStatusHistory(env, service.id, {
          status: 'unknown',
          message: 'Check failed',
        });
      }
    }
  } catch (error) {
    console.error('Error in custom checks:', error);
  }
}

/**
 * Check cloud provider status (AWS, Azure, GCP)
 */
async function runCloudStatusChecks(env: Env): Promise<void> {
  try {
    const [aws, azure, gcp] = await Promise.all([
      collectAWSStatus(env),
      collectAzureStatus(env),
      collectGCPStatus(env),
    ]);

    // Process each provider for incident tracking
    await Promise.all([
      processCloudIncidents(env, aws),
      processCloudIncidents(env, azure),
      processCloudIncidents(env, gcp),
    ]);

    // Store cloud status in database
    const now = new Date().toISOString();

    await env.DB.prepare(`
      INSERT INTO cloud_status (provider, overall_status, incidents, last_updated, checked_at)
      VALUES (?, ?, ?, ?, ?)
    `).bind('aws', aws.status, JSON.stringify(aws.incidents), aws.lastUpdated, now).run();

    await env.DB.prepare(`
      INSERT INTO cloud_status (provider, overall_status, incidents, last_updated, checked_at)
      VALUES (?, ?, ?, ?, ?)
    `).bind('azure', azure.status, JSON.stringify(azure.incidents), azure.lastUpdated, now).run();

    await env.DB.prepare(`
      INSERT INTO cloud_status (provider, overall_status, incidents, last_updated, checked_at)
      VALUES (?, ?, ?, ?, ?)
    `).bind('gcp', gcp.status, JSON.stringify(gcp.incidents), gcp.lastUpdated, now).run();

    console.log(`✓ Cloud status: AWS=${aws.status}, Azure=${azure.status}, GCP=${gcp.status}`);
  } catch (error) {
    console.error('Error checking cloud status:', error);
  }
}

/**
 * Process cloud incidents and create events for new/resolved incidents
 */
async function processCloudIncidents(env: Env, provider: any): Promise<void> {
  try {
    // Get current incident hashes
    const currentIncidents = new Map();
    for (const incident of provider.incidents) {
      const hash = hashIncident(incident.title, incident.startTime);
      currentIncidents.set(hash, incident);
    }

    // Get previously tracked incidents from alert_state
    const previousIncidents = await getPreviousCloudIncidents(env, provider.name);

    // Detect new incidents
    for (const [hash, incident] of currentIncidents) {
      if (!previousIncidents.has(hash)) {
        // New incident detected
        const severity = incident.severity === 'critical' || incident.severity === 'major' ? 'critical' : 'warning';

        await createEvent(env, {
          source: 'cloud',
          event_type: EVENT_TYPES.CLOUD_INCIDENT_STARTED,
          severity,
          title: `${provider.name}: ${incident.title}`,
          description: incident.message?.substring(0, 500),
          entity_id: hash,
          entity_name: `${provider.name}${incident.regions ? ' - ' + incident.regions.join(', ') : ''}`,
          occurred_at: incident.startTime || new Date().toISOString(),
        });

        // Track this incident
        await updateAlertState(env, 'cloud-incident', hash, 'active');
        console.log(`📢 New cloud incident: ${provider.name} - ${incident.title}`);
      }
    }

    // Detect resolved incidents
    for (const prevHash of previousIncidents) {
      if (!currentIncidents.has(prevHash)) {
        // Incident resolved
        await createEvent(env, {
          source: 'cloud',
          event_type: EVENT_TYPES.CLOUD_INCIDENT_RESOLVED,
          severity: 'info',
          title: `${provider.name} incident resolved`,
          description: 'Incident no longer reported in status feed',
          entity_id: prevHash,
          entity_name: provider.name,
          occurred_at: new Date().toISOString(),
        });

        // Remove from alert_state
        await env.DB.prepare(`
          DELETE FROM alert_state WHERE entity_type = 'cloud-incident' AND entity_id = ?
        `).bind(prevHash).run();

        console.log(`✅ Cloud incident resolved: ${provider.name}`);
      }
    }
  } catch (error) {
    console.error(`Error processing cloud incidents for ${provider.name}:`, error);
  }
}

/**
 * Check productivity suites (M365)
 */
async function runProductivityChecks(env: Env): Promise<void> {
  try {
    // Check M365
    const m365 = await collectM365Status(env);
    const now = new Date().toISOString();

    // Process each service and update m365_current
    for (const service of m365.services) {
      const newStatus = service.status;
      const newIssues = JSON.stringify(service.issues);

      // Get previous status from m365_current
      const previous = await env.DB.prepare(`
        SELECT status, last_changed FROM m365_current WHERE service_name = ?
      `).bind(service.name).first();

      const statusChanged = !previous || previous.status !== newStatus;

      // Update m365_current with latest check
      await env.DB.prepare(`
        INSERT OR REPLACE INTO m365_current (service_name, status, issues, last_changed, checked_at)
        VALUES (?, ?, ?, ?, ?)
      `).bind(
        service.name,
        newStatus,
        newIssues,
        statusChanged ? now : (previous?.last_changed || now),
        now
      ).run();

      // Only write to m365_health if status actually changed
      if (statusChanged) {
        await env.DB.prepare(`
          INSERT INTO m365_health (service_name, status, issues, checked_at)
          VALUES (?, ?, ?, ?)
        `).bind(
          service.name,
          newStatus,
          newIssues,
          now
        ).run();
      }

      // Process M365 issues for events
      await processM365Issues(env, service);
    }

    // Record overall M365 status to status_history (for ServiceTicker)
    // Microsoft 365 service_id = 12 (from migrations/0001_initial.sql)
    await recordStatusHistory(env, 12, {
      status: m365.overall as ServiceStatus,
      message: `${m365.services.length} services monitored`,
    });

    console.log(`✓ M365: ${m365.overall} (${m365.services.length} services)`);
  } catch (error) {
    console.error('Error checking productivity suites:', error);
    // Record failure so the card shows 'unknown' with meaningful message
    await recordStatusHistory(env, 12, {
      status: 'unknown',
      message: 'Check failed',
    });
  }
}

/**
 * Process M365 issues and create events for new/resolved issues
 */
async function processM365Issues(env: Env, service: any): Promise<void> {
  try {
    const currentIssueIds = new Set(service.issues.map((i: any) => i.id));
    const previousIssueIds = await getPreviousM365Issues(env, service.name);

    // New issues
    for (const issue of service.issues) {
      if (!previousIssueIds.has(issue.id)) {
        const severity = issue.severity === 'Incident' || issue.severity === 'critical' ? 'critical' :
                        issue.severity === 'Advisory' ? 'warning' : 'info';

        await createEvent(env, {
          source: 'm365',
          event_type: EVENT_TYPES.M365_ISSUE,
          severity: severity as any,
          title: `M365 ${service.name}: ${issue.title}`,
          description: issue.impactDescription?.substring(0, 500),
          entity_id: `${service.name}-${issue.id}`,
          entity_name: `M365 ${service.name}`,
          occurred_at: issue.startTime || new Date().toISOString(),
        });

        // Track this issue
        await updateAlertState(env, 'm365-issue', `${service.name}-${issue.id}`, 'active');
        console.log(`📢 New M365 issue: ${service.name} - ${issue.title}`);
      }
    }

    // Resolved issues
    for (const prevId of previousIssueIds) {
      if (!currentIssueIds.has(prevId)) {
        await createEvent(env, {
          source: 'm365',
          event_type: EVENT_TYPES.M365_RESOLVED,
          severity: 'info',
          title: `M365 ${service.name} issue resolved`,
          description: 'Issue no longer reported',
          entity_id: `${service.name}-${prevId}`,
          entity_name: `M365 ${service.name}`,
          occurred_at: new Date().toISOString(),
        });

        // Remove from alert_state
        await env.DB.prepare(`
          DELETE FROM alert_state WHERE entity_type = 'm365-issue' AND entity_id = ?
        `).bind(`${service.name}-${prevId}`).run();

        console.log(`✅ M365 issue resolved: ${service.name}`);
      }
    }
  } catch (error) {
    console.error(`Error processing M365 issues for ${service.name}:`, error);
  }
}

/**
 * Check ISP health via Cloudflare Radar
 */
async function runISPChecks(env: Env): Promise<void> {
  try {
    const metrics = await checkAllISPs(env);

    // Write results to database and create events
    for (const metric of metrics) {
      await env.DB.prepare(`
        INSERT INTO isp_check_history (isp_id, check_type, status, response_time_ms, details, checked_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `).bind(
        metric.isp.id,
        'combined',
        metric.status,
        null,
        JSON.stringify({
          metrics: metric.metrics,
          rpki: metric.rpki,
          anomalies: metric.anomalies,
          bgpIncidents: metric.bgpIncidents,
        }),
        metric.lastChecked
      ).run();

      // Process ISP status changes for events
      await processISPStatusChange(env, metric);
    }

    console.log(`✓ ISP checks: ${metrics.map(m => `${m.isp.name}=${m.status}`).join(', ')}`);
  } catch (error) {
    console.error('Error checking ISPs:', error);
  }
}

/**
 * Process ISP status changes and create events
 */
async function processISPStatusChange(env: Env, metric: any): Promise<void> {
  try {
    const entityId = `isp-${metric.isp.id}`;
    const previousState = await getAlertState(env, 'isp', entityId);

    // Check for status changes
    if (metric.status === 'degraded' || metric.status === 'outage') {
      if (!previousState || previousState.last_status === 'operational') {
        const eventType = metric.status === 'outage' ? EVENT_TYPES.ISP_OUTAGE : EVENT_TYPES.ISP_DEGRADED;
        const severity = metric.status === 'outage' ? 'critical' : 'warning';

        await createEvent(env, {
          source: 'isp',
          event_type: eventType,
          severity: severity as any,
          title: `${metric.isp.name}: Connectivity ${metric.status}`,
          description: formatISPMetrics(metric),
          entity_id: entityId,
          entity_name: metric.isp.name,
          occurred_at: new Date().toISOString(),
        });

        console.log(`📢 ISP status change: ${metric.isp.name} - ${metric.status}`);
      }
    } else if (metric.status === 'operational') {
      if (previousState && (previousState.last_status === 'degraded' || previousState.last_status === 'outage')) {
        await createEvent(env, {
          source: 'isp',
          event_type: EVENT_TYPES.ISP_RESOLVED,
          severity: 'info',
          title: `${metric.isp.name}: Connectivity restored`,
          entity_id: entityId,
          entity_name: metric.isp.name,
          occurred_at: new Date().toISOString(),
        });

        console.log(`✅ ISP restored: ${metric.isp.name}`);
      }
    }

    // Update alert state
    await updateAlertState(env, 'isp', entityId, metric.status);

    // Process BGP incidents
    if (metric.bgpIncidents && metric.bgpIncidents.length > 0) {
      for (const incident of metric.bgpIncidents) {
        const incidentId = `bgp-${metric.isp.id}-${incident.type || 'incident'}`;
        const exists = await env.DB.prepare(`
          SELECT 1 FROM alert_state WHERE entity_type = 'isp-bgp' AND entity_id = ?
        `).bind(incidentId).first();

        if (!exists) {
          await createEvent(env, {
            source: 'isp',
            event_type: EVENT_TYPES.ISP_BGP,
            severity: 'critical',
            title: `${metric.isp.name}: BGP ${incident.type || 'incident'} detected`,
            description: incident.description || 'BGP routing anomaly detected',
            entity_id: incidentId,
            entity_name: metric.isp.name,
            occurred_at: new Date().toISOString(),
          });

          await updateAlertState(env, 'isp-bgp', incidentId, 'active');
          console.log(`📢 BGP incident: ${metric.isp.name}`);
        }
      }
    }
  } catch (error) {
    console.error(`Error processing ISP status for ${metric.isp.name}:`, error);
  }
}

/**
 * Format ISP metrics for event description
 */
function formatISPMetrics(metric: any): string {
  const parts = [];

  if (metric.metrics) {
    if (metric.metrics.latency) {parts.push(`Latency: ${metric.metrics.latency}ms`);}
    if (metric.metrics.jitter) {parts.push(`Jitter: ${metric.metrics.jitter}ms`);}
    if (metric.metrics.packetLoss) {parts.push(`Packet loss: ${metric.metrics.packetLoss}%`);}
  }

  if (metric.anomalies && metric.anomalies.length > 0) {
    parts.push(`Anomalies: ${metric.anomalies.join(', ')}`);
  }

  return parts.length > 0 ? parts.join(', ') : 'ISP connectivity issue detected';
}

/**
 * Record service status check to history and create events
 */
async function recordStatusHistory(
  env: Env,
  serviceId: number,
  result: CheckResult
): Promise<void> {
  try {
    // Insert status history
    await env.DB.prepare(`
      INSERT INTO status_history (service_id, status, response_time_ms, message, is_maintenance, checked_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).bind(
      serviceId,
      result.status,
      result.responseTime || null,
      result.message || null,
      result.isMaintenance ? 1 : 0,
      new Date().toISOString()
    ).run();

    // Get service details for event generation
    const service = await env.DB.prepare(`
      SELECT id, name FROM services WHERE id = ?
    `).bind(serviceId).first();

    if (!service) {return;}

    const serviceName = (service as any).name;
    const entityId = `service-${serviceId}`;

    // Create events based on status changes
    await createEventIfChanged(env, {
      source: 'service',
      event_type: result.status === 'outage' ? EVENT_TYPES.SERVICE_OUTAGE :
                  result.status === 'degraded' ? EVENT_TYPES.SERVICE_DEGRADED :
                  EVENT_TYPES.SERVICE_RESOLVED,
      entityId,
      entityName: serviceName,
      currentStatus: result.status,
      description: result.message || undefined,
    });
  } catch (error) {
    console.error(`Failed to record status for service ${serviceId}:`, error);
  }
}

/**
 * Clean up old data (runs daily at 3 AM)
 */
async function cleanupOldData(env: Env): Promise<void> {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const timestamp = thirtyDaysAgo.toISOString();

  try {
    // Clean up old status history
    const statusResult = await env.DB.prepare(
      'DELETE FROM status_history WHERE checked_at < ?'
    ).bind(timestamp).run();

    // Clean up old cloud status
    const cloudResult = await env.DB.prepare(
      'DELETE FROM cloud_status WHERE checked_at < ?'
    ).bind(timestamp).run();

    // Clean up old M365 health records
    const m365Result = await env.DB.prepare(
      'DELETE FROM m365_health WHERE checked_at < ?'
    ).bind(timestamp).run();

    // Clean up old events
    const eventsResult = await env.DB.prepare(
      'DELETE FROM events WHERE created_at < ? OR (expires_at IS NOT NULL AND expires_at < ?)'
    ).bind(timestamp, new Date().toISOString()).run();

    // Clean up expired cache entries
    const cacheResult = await env.DB.prepare(
      'DELETE FROM api_cache WHERE expires_at < ?'
    ).bind(new Date().toISOString()).run();

    // Clean up old ransomware data
    const ransomwareStatsResult = await env.DB.prepare(
      'DELETE FROM ransomware_stats WHERE checked_at < datetime(?, "-90 days")'
    ).bind(timestamp).run();

    const ransomwareVictimsResult = await env.DB.prepare(
      'DELETE FROM ransomware_victims WHERE last_seen < datetime(?, "-30 days")'
    ).bind(timestamp).run();

    const ransomwareDailyResult = await env.DB.prepare(
      'DELETE FROM ransomware_daily_counts WHERE date < date(?, "-180 days")'
    ).bind(timestamp).run();

    const ransomwareSectorsResult = await env.DB.prepare(
      'DELETE FROM ransomware_sectors WHERE checked_at < datetime(?, "-7 days")'
    ).bind(timestamp).run();

    // Clean up old CISA KEV data (90 days)
    const kevResult = await env.DB.prepare(
      'DELETE FROM cisa_kev WHERE last_seen < datetime(?, "-90 days")'
    ).bind(timestamp).run();

    const kevMetadataResult = await env.DB.prepare(
      'DELETE FROM cisa_kev_metadata WHERE checked_at < ?'
    ).bind(timestamp).run();

    console.log('Data cleanup completed:', {
      statusHistory: statusResult.meta?.changes || 0,
      cloudStatus: cloudResult.meta?.changes || 0,
      m365Health: m365Result.meta?.changes || 0,
      events: eventsResult.meta?.changes || 0,
      cache: cacheResult.meta?.changes || 0,
      ransomwareStats: ransomwareStatsResult.meta?.changes || 0,
      ransomwareVictims: ransomwareVictimsResult.meta?.changes || 0,
      ransomwareDaily: ransomwareDailyResult.meta?.changes || 0,
      ransomwareSectors: ransomwareSectorsResult.meta?.changes || 0,
      cisaKev: kevResult.meta?.changes || 0,
      cisaKevMetadata: kevMetadataResult.meta?.changes || 0,
    });
  } catch (error) {
    console.error('Error during data cleanup:', error);
  }
}
