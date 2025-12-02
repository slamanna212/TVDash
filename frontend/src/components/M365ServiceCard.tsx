import { Card, Stack, Group, Text, Box } from '@mantine/core';
import type { M365Service } from '../api/client';
import { statusColors } from '../theme';
import { getTimeAgo, formatUpdateTime } from '../utils/time';
import { StatusBadge } from './StatusBadge';

interface M365ServiceCardProps {
  service: M365Service;
  updatedAt: string;
}

export function M365ServiceCard({ service, updatedAt }: M365ServiceCardProps) {
  const getBorderColor = (status: string): string => {
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
  };

  const mostRecentIssue = service.issues && service.issues.length > 0
    ? service.issues[0]
    : null;

  return (
    <Card
      shadow="md"
      padding="md"
      radius="md"
      className={service.status === 'outage' ? 'service-card service-card-outage' : 'service-card'}
      style={{
        minHeight: '140px',
        maxHeight: '170px',
        background: 'var(--bg-secondary)',
        borderLeft: `3px solid ${getBorderColor(service.status)}`,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <Stack gap="sm" style={{ height: '100%' }}>
        {/* Header with service name and status */}
        <Group justify="space-between" align="flex-start" wrap="nowrap">
          <Box style={{ flex: 1, minWidth: 0 }}>
            <Text
              size="calc(var(--font-md) * 1.0)"
              fw={700}
              style={{ lineHeight: 1.2 }}
              truncate
            >
              {service.name}
            </Text>
          </Box>
          <StatusBadge status={service.status} size="sm" />
        </Group>

        {/* Issue preview or operational message */}
        <Box style={{ flex: 1, minWidth: 0 }}>
          {service.status === 'operational' ? (
            <Text c="dimmed" size="sm" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span>✓</span> All systems operational
            </Text>
          ) : mostRecentIssue ? (
            <Stack gap="xs">
              <Text
                size="sm"
                fw={500}
                style={{
                  overflow: 'hidden',
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  lineHeight: 1.4,
                }}
              >
                {mostRecentIssue.title}
              </Text>
              <Text size="xs" c="dimmed">
                Started: {getTimeAgo(mostRecentIssue.startTime)}
              </Text>
              {service.issues.length > 1 && (
                <Text size="xs" c="dimmed">
                  + {service.issues.length - 1} more issue
                  {service.issues.length - 1 !== 1 ? 's' : ''}
                </Text>
              )}
            </Stack>
          ) : service.status === 'outage' ? (
            <Text c="dimmed" size="sm" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span>✗</span> Service outage - No details available
            </Text>
          ) : service.status === 'degraded' ? (
            <Text c="dimmed" size="sm" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span>⚠</span> Service degraded - No details available
            </Text>
          ) : (
            <Text c="dimmed" size="sm">
              Status unavailable
            </Text>
          )}
        </Box>

        {/* Last updated */}
        <Text size="xs" c="dimmed" mt="auto">
          Updated: {formatUpdateTime(updatedAt)}
        </Text>
      </Stack>
    </Card>
  );
}
