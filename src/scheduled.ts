import type { Env, Service, CheckResult, ServiceStatus } from './types';
import { performHttpCheck } from './collectors/http-check';
import { checkStatuspageStatus, checkStatuspageStatusWithGroups } from './collectors/statuspage';
import { checkStatusHubStatus } from './collectors/statushub';
import { checkProofpointCommunityStatus } from './collectors/proofpoint-community';
import { collectAWSStatus } from './collectors/cloud/aws';
import { collectAzureStatus } from './collectors/cloud/azure';
import { collectGCPStatus } from './collectors/cloud/gcp';
import { collectM365Status } from './collectors/productivity/microsoft';

export async function handleScheduled(
  event: ScheduledEvent,
  env: Env,
  ctx: ExecutionContext
): Promise<void> {
  const cron = event.cron;
  console.log(`Cron triggered: ${cron} at ${new Date(event.scheduledTime).toISOString()}`);

  try {
    // Every minute tasks
    if (cron === '* * * * *') {
      console.log('Running 1-minute tasks: HTTP health checks');
      await runHttpHealthChecks(env);
    }

    // Every 5 minute tasks
    if (cron === '*/5 * * * *') {
      console.log('Running 5-minute tasks');
      await Promise.all([
        runStatuspageChecks(env),
        runCustomChecks(env),
        runCloudStatusChecks(env),
        runProductivityChecks(env),
      ]);
    }

    // Every 15 minute tasks
    if (cron === '*/15 * * * *') {
      console.log('Running 15-minute tasks');
      // Placeholder for future Radar IQI/Speed metrics
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
    // Get all services with check_type = 'http'
    const result = await env.DB.prepare(`
      SELECT * FROM services WHERE check_type = 'http' AND check_url IS NOT NULL
    `).all();

    if (!result.success || !result.results) {
      console.error('Failed to fetch HTTP services');
      return;
    }

    const services = result.results as Service[];

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
 * Check productivity suites (M365)
 */
async function runProductivityChecks(env: Env): Promise<void> {
  try {
    // Check M365
    const m365 = await collectM365Status(env);

    // Write detailed service data to m365_health table (for detailed M365 page)
    for (const service of m365.services) {
      await env.DB.prepare(`
        INSERT INTO m365_health (service_name, status, issues, checked_at)
        VALUES (?, ?, ?, ?)
      `).bind(
        service.name,
        service.status,
        JSON.stringify(service.issues),
        new Date().toISOString()
      ).run();
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
 * Record service status check to history
 */
async function recordStatusHistory(
  env: Env,
  serviceId: number,
  result: CheckResult
): Promise<void> {
  try {
    await env.DB.prepare(`
      INSERT INTO status_history (service_id, status, response_time_ms, message, checked_at)
      VALUES (?, ?, ?, ?, ?)
    `).bind(
      serviceId,
      result.status,
      result.responseTime || null,
      result.message || null,
      new Date().toISOString()
    ).run();
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

    console.log('Data cleanup completed:', {
      statusHistory: statusResult.meta?.changes || 0,
      cloudStatus: cloudResult.meta?.changes || 0,
      m365Health: m365Result.meta?.changes || 0,
      events: eventsResult.meta?.changes || 0,
      cache: cacheResult.meta?.changes || 0,
    });
  } catch (error) {
    console.error('Error during data cleanup:', error);
  }
}
