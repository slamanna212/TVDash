/**
 * Convert a date string to a relative time format
 * Examples: "3h ago", "2d ago", "Just now"
 */
export function getTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffDays > 0) {
    return `${diffDays}d ago`;
  } else if (diffHours > 0) {
    return `${diffHours}h ago`;
  } else if (diffMins > 0) {
    return `${diffMins}m ago`;
  } else {
    return 'Just now';
  }
}

/**
 * Format a date string as HH:MM:SS
 */
export function formatUpdateTime(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleTimeString();
}
