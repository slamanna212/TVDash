import { statusColors } from '../theme';

/**
 * Format a timestamp as a relative time string (e.g., "5 minutes ago")
 */
export function formatTimeAgo(timestamp: string | undefined): string {
  if (!timestamp) return 'Never';

  const now = new Date();
  const then = new Date(timestamp);
  const diffMs = now.getTime() - then.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSeconds < 60) {
    return diffSeconds === 1 ? '1 second ago' : `${diffSeconds} seconds ago`;
  } else if (diffMinutes < 60) {
    return diffMinutes === 1 ? '1 minute ago' : `${diffMinutes} minutes ago`;
  } else if (diffHours < 24) {
    return diffHours === 1 ? '1 hour ago' : `${diffHours} hours ago`;
  } else {
    return diffDays === 1 ? '1 day ago' : `${diffDays} days ago`;
  }
}

/**
 * Get the border color for a given status
 */
export function getBorderColor(status: string): string {
  switch (status) {
    case 'operational':
      return statusColors.operational;
    case 'degraded':
      return statusColors.degraded;
    case 'outage':
      return statusColors.outage;
    default:
      return statusColors.unknown;
  }
}
