import { Badge } from '@mantine/core';
import { statusColors } from '../theme';

interface StatusBadgeProps {
  status: 'operational' | 'degraded' | 'outage' | 'unknown';
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
}

const statusLabels = {
  operational: 'Operational',
  degraded: 'Degraded',
  outage: 'Outage',
  unknown: 'Unknown',
};

const statusIcons = {
  operational: '✓',
  degraded: '⚠',
  outage: '✗',
  unknown: '?',
};

export function StatusBadge({ status, size = 'md' }: StatusBadgeProps) {
  return (
    <Badge
      color={statusColors[status]}
      size={size}
      radius="sm"
      variant="filled"
      style={{
        backgroundColor: statusColors[status],
        color: '#fff',
        fontWeight: 600,
      }}
    >
      {statusIcons[status]} {statusLabels[status]}
    </Badge>
  );
}
