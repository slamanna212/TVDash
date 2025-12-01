import { Box, Title, Grid, Text, Badge, Stack, Group, Loader, Center } from '@mantine/core';
import { useAutoRefresh } from '../hooks/useAutoRefresh';
import { apiClient, CloudRegion } from '../api/client';
import { CloudRegionCard } from '../components/CloudRegionCard';
import { getProviderIcon } from '../utils/cloudIcons';

export function CloudStatusPage() {
  const { data, loading, error } = useAutoRefresh(
    () => apiClient.getCloud(),
    60 // Refresh every minute
  );

  // Sort regions by status priority (outage > degraded > operational)
  const sortRegionsByStatus = (regions: CloudRegion[]) => {
    const statusPriority: Record<string, number> = {
      outage: 0,
      degraded: 1,
      operational: 2,
      unknown: 3,
    };
    return [...regions].sort((a, b) =>
      statusPriority[a.status] - statusPriority[b.status]
    );
  };

  // Reorder providers: Azure, AWS, Google Cloud
  const orderedProviders = data?.providers
    ? [
        data.providers.find((p) => p.name === 'Azure'),
        data.providers.find((p) => p.name === 'AWS'),
        data.providers.find((p) => p.name === 'Google Cloud'),
      ].filter((p): p is NonNullable<typeof p> => p !== undefined)
    : [];

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
              {sortRegionsByStatus(provider.regions).map((region) => (
                <CloudRegionCard key={region.key} region={region} />
              ))}
            </Stack>
          </Grid.Col>
        ))}
      </Grid>
    </Box>
  );
}
