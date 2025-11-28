import type { ServiceStatus } from '../types';

/**
 * Determine the priority/severity of a status
 * Higher number = more severe
 */
export function statusPriority(status: ServiceStatus): number {
  const priorities: Record<ServiceStatus, number> = {
    'unknown': 0,
    'operational': 1,
    'degraded': 2,
    'outage': 3,
  };
  return priorities[status] || 0;
}

/**
 * Get the most severe status from an array of statuses
 */
export function getMostSevereStatus(statuses: ServiceStatus[]): ServiceStatus {
  if (statuses.length === 0) return 'unknown';

  return statuses.reduce((mostSevere, current) => {
    return statusPriority(current) > statusPriority(mostSevere) ? current : mostSevere;
  });
}

/**
 * Determine if a status change warrants an alert
 */
export function shouldAlert(oldStatus: ServiceStatus, newStatus: ServiceStatus): boolean {
  // Always alert on outages
  if (newStatus === 'outage') return true;

  // Alert on degradation from operational
  if (oldStatus === 'operational' && newStatus === 'degraded') return true;

  // Alert on recovery
  if ((oldStatus === 'outage' || oldStatus === 'degraded') && newStatus === 'operational') {
    return true;
  }

  return false;
}

/**
 * Get a human-readable description of a status change
 */
export function getStatusChangeDescription(
  oldStatus: ServiceStatus,
  newStatus: ServiceStatus
): string {
  if (newStatus === 'outage') {
    return 'Service is experiencing an outage';
  }

  if (newStatus === 'degraded' && oldStatus === 'operational') {
    return 'Service performance is degraded';
  }

  if (newStatus === 'operational' && oldStatus === 'outage') {
    return 'Service has recovered from outage';
  }

  if (newStatus === 'operational' && oldStatus === 'degraded') {
    return 'Service has returned to normal operation';
  }

  return `Status changed from ${oldStatus} to ${newStatus}`;
}

/**
 * Calculate uptime percentage from status history
 */
export function calculateUptime(
  statusHistory: Array<{ status: ServiceStatus; checked_at: string }>
): number {
  if (statusHistory.length === 0) return 100;

  const operationalCount = statusHistory.filter(h => h.status === 'operational').length;
  return (operationalCount / statusHistory.length) * 100;
}

/**
 * Determine status from HTTP status code
 */
export function statusFromHttpCode(statusCode: number): ServiceStatus {
  if (statusCode >= 200 && statusCode < 300) {
    return 'operational';
  }

  if (statusCode >= 500) {
    return 'outage';
  }

  if (statusCode >= 400) {
    return 'degraded';
  }

  return 'unknown';
}
