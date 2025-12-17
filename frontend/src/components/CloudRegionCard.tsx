import { Card, Stack, Group, Text, Box } from '@mantine/core';
import { memo } from 'react';
import type { CloudRegion } from '../api/client';
import { getRegionIcon } from '../utils/cloudIcons';
import { getBorderColor } from '../utils/format';

interface CloudRegionCardProps {
  region: CloudRegion;
}

// Local utility for short time format specific to CloudRegionCard
function getTimeAgo(dateString: string): string {
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
}

export const CloudRegionCard = memo(function CloudRegionCard({ region }: CloudRegionCardProps) {

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
        minHeight: 'var(--card-height-base)',
        maxHeight: 'var(--card-height-max)',
        background: 'var(--bg-secondary)',
        borderLeft: `var(--border-emphasis) solid ${getBorderColor(region.status)}`,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <Stack gap="sm" style={{ height: '100%' }}>
        {/* Header with region name */}
        <Box style={{ flex: 1, minWidth: 0 }}>
          <Group gap="xs" wrap="nowrap">
            <Box style={{ fontSize: 'var(--icon-sm)' }}>
              {getRegionIcon()}
            </Box>
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
});
