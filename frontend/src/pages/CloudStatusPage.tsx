import { Box, Title, Grid, Text, Badge, Stack, Group, Loader, Center } from '@mantine/core';
import { useMemo } from 'react';
import type { CloudRegion } from '../api/client';
import { apiClient } from '../api/client';
import { CloudRegionCard } from '../components/CloudRegionCard';
import { useAutoRefresh } from '../hooks/useAutoRefresh';
import { getProviderIcon } from '../utils/cloudIcons';

// Status priority for sorting (extracted to avoid recreating on every render)
const statusPriority: Record<string, number> = {
  outage: 0,
  degraded: 1,
  operational: 2,
  unknown: 3,
};

// Sort regions by status priority (outage > degraded > operational)
function sortRegionsByStatus(regions: CloudRegion[]): CloudRegion[] {
  return [...regions].sort((a, b) =>
    statusPriority[a.status] - statusPriority[b.status]
  );
}

export function CloudStatusPage() {
  const { data, loading, error } = useAutoRefresh(
    () => apiClient.getCloud(),
    60 // Refresh every minute
  );

  // Memoize ordered and sorted providers to prevent recalculation on every render
  const orderedProviders = useMemo(() => {
    if (!data?.providers) return [];

    return [
      data.providers.find((p) => p.name === 'Azure'),
      data.providers.find((p) => p.name === 'AWS'),
      data.providers.find((p) => p.name === 'Google Cloud'),
    ]
      .filter((p): p is NonNullable<typeof p> => p !== undefined)
      .map(provider => ({
        ...provider,
        regions: sortRegionsByStatus(provider.regions), // Sort regions once during memoization
      }));
  }, [data]);

  if (loading && !data) {
    return (
      <Center style={{ height: '100%' }}>
        <Loader size="xl" />
      </Center>
    );
  }

  if (error) {
    return (
      <Center style={{ height: '100%' }}>
        <Text size="xl" c="red">
          Error loading cloud status: {error.message}
        </Text>
      </Center>
    );
  }

  return (
    <Box
      style={{
        height: '100%',
        width: '100%',
        overflow: 'auto',
        scrollbarWidth: 'none', // Firefox
        msOverflowStyle: 'none', // IE/Edge
      }}
      className="cloud-status-container"
    >
      <Title order={1} style={{ fontSize: 'var(--font-xl)', marginBottom: '2vw' }}>
        Cloud Status
      </Title>

      {/* 3-Column Grid Layout - One column per provider */}
      <Grid gutter="md">
        {orderedProviders.map((provider) => (
          <Grid.Col key={provider.name} span={4}>
            {/* Provider Column Header */}
            <Group mb="md" align="center" gap="xs">
              {getProviderIcon(provider.name, 28)}
              <Title order={2} style={{ fontSize: 'calc(var(--font-lg) * 1.2)' }}>
                {provider.name}
              </Title>
              <Badge size="sm" color="gray" variant="light">
                {provider.regions.length}
              </Badge>
            </Group>

            {/* Vertical Stack of Region Cards - Sorted by Status */}
            <Stack gap="md">
              {provider.regions.map((region) => (
                <CloudRegionCard key={region.key} region={region} />
              ))}
            </Stack>
          </Grid.Col>
        ))}
      </Grid>
    </Box>
  );
}
