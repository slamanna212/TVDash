import type { Env } from './types';

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
      console.log('Running 1-minute tasks');
      // TODO: HTTP health checks for internal services
    }

    // Every 5 minute tasks
    if (cron === '*/5 * * * *') {
      console.log('Running 5-minute tasks');
      // TODO: Statuspage polling
      // TODO: Cloud status checks
      // TODO: M365 Graph API
      // TODO: Google Workspace
      // TODO: Radar data
      // TODO: Grid data
      // TODO: Alert processing
    }

    // Every 15 minute tasks
    if (cron === '*/15 * * * *') {
      console.log('Running 15-minute tasks');
      // TODO: Radar IQI/Speed metrics
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

async function cleanupOldData(env: Env): Promise<void> {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const timestamp = thirtyDaysAgo.toISOString();

  try {
    // Clean up old status history
    await env.DB.prepare(
      'DELETE FROM status_history WHERE checked_at < ?'
    ).bind(timestamp).run();

    // Clean up old events
    await env.DB.prepare(
      'DELETE FROM events WHERE created_at < ? OR (expires_at IS NOT NULL AND expires_at < ?)'
    ).bind(timestamp, new Date().toISOString()).run();

    // Clean up expired cache entries
    await env.DB.prepare(
      'DELETE FROM api_cache WHERE expires_at < ?'
    ).bind(new Date().toISOString()).run();

    console.log('Data cleanup completed successfully');
  } catch (error) {
    console.error('Error during data cleanup:', error);
  }
}
