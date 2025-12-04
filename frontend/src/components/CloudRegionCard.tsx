import { Card, Stack, Group, Text, Box } from '@mantine/core';
import type { CloudRegion } from '../api/client';
import { statusColors } from '../theme';
import { getRegionIcon } from '../utils/cloudIcons';

interface CloudRegionCardProps {
  region: CloudRegion;
}

export function CloudRegionCard({ region }: CloudRegionCardProps) {
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

  const getTimeAgo = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);

    if (diffHours > 0) {
      return `${diffHours}h ago`;
    } else if (diffMins > 0) {
      return `${diffMins}m ago`;
    } else {
      return 'Just now';
    }
  };

  const mostRecentIncident = region.affectedIncidents.length > 0
    ? region.affectedIncidents[0]
    : null;

  return (
    <Card
      shadow="md"
      padding="md"
      radius="md"
      className={region.status === 'outage' ? 'region-card region-card-outage' : 'region-card'}
      style={{
        minHeight: '140px',
        maxHeight: '170px',
        background: 'var(--bg-secondary)',
        borderLeft: `8px solid ${getBorderColor(region.status)}`,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <Stack gap="sm" style={{ height: '100%' }}>
        {/* Header with region name */}
        <Box style={{ flex: 1, minWidth: 0 }}>
          <Group gap="xs" wrap="nowrap">
            {getRegionIcon(20)}
            <Text
              size="calc(var(--font-md) * 1.4)"
              fw={700}
              style={{ lineHeight: 1.2 }}
              truncate
            >
              {region.name}
            </Text>
          </Group>
          <Text size="xs" c="dimmed" mt={2}>
            {region.location}
          </Text>
        </Box>

        {/* Incident preview or operational message */}
        <Box style={{ flex: 1, minWidth: 0 }}>
          {mostRecentIncident ? (
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
                {mostRecentIncident.title}
              </Text>
              <Text size="xs" c="dimmed">
                Started: {getTimeAgo(mostRecentIncident.startTime)}
              </Text>
              {region.affectedIncidents.length > 1 && (
                <Text size="xs" c="dimmed">
                  + {region.affectedIncidents.length - 1} more incident
                  {region.affectedIncidents.length - 1 !== 1 ? 's' : ''}
                </Text>
              )}
            </Stack>
          ) : (
            <Text c="dimmed" size="sm" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span>✓</span> All systems operational
            </Text>
          )}
        </Box>

        {/* Last updated */}
        <Text size="xs" c="dimmed" mt="auto">
          Updated: {new Date(region.lastUpdated).toLocaleTimeString()}
        </Text>
      </Stack>
    </Card>
  );
}
