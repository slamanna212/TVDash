/**
 * Format a date as a relative time string (e.g., "2 hours ago")
 */
export function formatRelativeTime(date: Date | string): string {
  const now = new Date();
  const then = typeof date === 'string' ? new Date(date) : date;
  const diffMs = now.getTime() - then.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSeconds < 60) {
    return 'just now';
  } else if (diffMinutes < 60) {
    return `${diffMinutes} minute${diffMinutes === 1 ? '' : 's'} ago`;
  } else if (diffHours < 24) {
    return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
  } else if (diffDays < 7) {
    return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
  } else {
    return then.toLocaleDateString();
  }
}

/**
 * Format a duration in milliseconds as a human-readable string
 */
export function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) {
    return `${days}d ${hours % 24}h`;
  } else if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  } else {
    return `${seconds}s`;
  }
}

/**
 * Check if a timestamp is within the last N hours
 */
export function isWithinHours(timestamp: string, hours: number): boolean {
  const then = new Date(timestamp);
  const now = new Date();
  const diffHours = (now.getTime() - then.getTime()) / (1000 * 60 * 60);
  return diffHours <= hours;
}

/**
 * Get a date N days ago
 */
export function getDaysAgo(days: number): Date {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date;
}

/**
 * Format a timestamp for display
 */
export function formatTimestamp(timestamp: string | Date, includeSeconds = false): string {
  const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;

  const options: Intl.DateTimeFormatOptions = {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    ...(includeSeconds && { second: '2-digit' }),
  };

  return date.toLocaleString('en-US', options);
}

/**
 * Calculate the time until a future date
 */
export function timeUntil(futureDate: Date | string): string {
  const future = typeof futureDate === 'string' ? new Date(futureDate) : futureDate;
  const now = new Date();
  const diffMs = future.getTime() - now.getTime();

  if (diffMs <= 0) {
    return 'expired';
  }

  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffDays > 0) {
    return `in ${diffDays} day${diffDays === 1 ? '' : 's'}`;
  } else if (diffHours > 0) {
    return `in ${diffHours} hour${diffHours === 1 ? '' : 's'}`;
  } else if (diffMinutes > 0) {
    return `in ${diffMinutes} minute${diffMinutes === 1 ? '' : 's'}`;
  } else {
    return 'soon';
  }
}
