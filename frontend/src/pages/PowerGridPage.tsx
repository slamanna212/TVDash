import { Box, Title, Grid, Card, Text, Stack, Loader, Center, RingProgress, Group } from '@mantine/core';
import { useAutoRefresh } from '../hooks/useAutoRefresh';
import { apiClient } from '../api/client';
import { IconBolt, IconAlertTriangle } from '@tabler/icons-react';

// Fuel type display names and colors
const FUEL_CONFIG: Record<string, { name: string; color: string }> = {
  NG: { name: 'Natural Gas', color: '#2196f3' },  // Blue
  NUC: { name: 'Nuclear', color: '#9c27b0' },      // Purple
  COL: { name: 'Coal', color: '#795548' },         // Brown
  WND: { name: 'Wind', color: '#4caf50' },         // Green
  SUN: { name: 'Solar', color: '#ff9800' },        // Orange
  WAT: { name: 'Hydro', color: '#00bcd4' },        // Cyan
  OIL: { name: 'Oil', color: '#f44336' },          // Red
  OTH: { name: 'Other', color: '#9e9e9e' },        // Gray
};

export function PowerGridPage() {
  const { data, loading, error } = useAutoRefresh(
    () => apiClient.getGrid(),
    60 // Refresh every minute
  );

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
          Error loading grid status: {error.message}
        </Text>
      </Center>
    );
  }

  const statusColor = {
    operational: '#1b5e20',  // Dark green
    degraded: '#f57f17',     // Dark yellow/orange
    outage: '#b71c1c',       // Dark red
    unknown: '#424242',      // Dark gray
  }[data.status];

  // Prepare fuel mix sections for RingProgress
  const fuelSections = data.fuel_mix && Object.keys(data.fuel_mix).length > 0
    ? Object.entries(data.fuel_mix).map(([fuel, percentage]) => ({
        value: percentage,
        color: FUEL_CONFIG[fuel]?.color || '#9e9e9e',
        tooltip: `${FUEL_CONFIG[fuel]?.name || fuel}: ${percentage}%`,
      }))
    : [];

  return (
    <Box style={{ height: '100%', width: '100%', padding: '1.5vw', overflow: 'auto' }}>
      <Title order={1} style={{ fontSize: 'var(--font-xl)', marginBottom: '1.5vw' }}>
        Power Grid - PJM Region (PA, NJ, DE)
      </Title>

      <Grid gutter="md">
        {/* Main Status Card */}
        <Grid.Col span={6}>
          <Card
            shadow="sm"
            padding="lg"
            style={{
              backgroundColor: statusColor,
              height: 'auto',
            }}
          >
            <Stack align="center" gap="sm" justify="center">
              <IconBolt size={80} stroke={1.5} />
              <Title order={2} style={{ fontSize: 'calc(var(--font-lg) * 1.5)' }}>
                {data.status.toUpperCase()}
              </Title>
              <Text size="md">
                Last updated: {new Date(data.checked_at).toLocaleTimeString()}
              </Text>
            </Stack>
          </Card>
        </Grid.Col>

        {/* Fuel Mix Ring Progress */}
        <Grid.Col span={6}>
          <Card shadow="sm" padding="lg" style={{ height: 'auto' }}>
            <Stack align="center" gap="sm" justify="center">
              <Title order={3} style={{ fontSize: 'var(--font-lg)' }}>
                Fuel Mix
              </Title>
              {fuelSections.length > 0 ? (
                <>
                  <RingProgress
                    size={180}
                    thickness={20}
                    sections={fuelSections}
                    label={
                      <Stack align="center" gap={0}>
                        <Text size="xs" c="dimmed">Generation</Text>
                        <Text size="lg" fw={700}>Sources</Text>
                      </Stack>
                    }
                  />
                  {/* Legend */}
                  <Stack gap={4} style={{ width: '100%' }}>
                    {Object.entries(data.fuel_mix!).map(([fuel, percentage]) => (
                      <Group key={fuel} justify="space-between">
                        <Group gap="xs">
                          <Box
                            style={{
                              width: 12,
                              height: 12,
                              borderRadius: 3,
                              backgroundColor: FUEL_CONFIG[fuel]?.color || '#9e9e9e',
                            }}
                          />
                          <Text size="xs">{FUEL_CONFIG[fuel]?.name || fuel}</Text>
                        </Group>
                        <Text size="xs" fw={600}>{percentage}%</Text>
                      </Group>
                    ))}
                  </Stack>
                </>
              ) : (
                <Text c="dimmed" size="md">Fuel mix data not available</Text>
              )}
            </Stack>
          </Card>
        </Grid.Col>

        {/* Active Alerts */}
        <Grid.Col span={12}>
          <Card
            shadow="sm"
            padding="md"
            style={{
              backgroundColor: data.alerts && data.alerts.length > 0 ? '#b71c1c' : undefined,
            }}
          >
            <Group mb="sm">
              <IconAlertTriangle size={28} />
              <Title order={3} style={{ fontSize: 'var(--font-lg)' }}>
                Active Alerts
              </Title>
            </Group>
            {data.alerts && data.alerts.length > 0 ? (
              <Stack gap="xs">
                {data.alerts.map((alert, idx) => (
                  <Text key={idx} size="md">{alert}</Text>
                ))}
              </Stack>
            ) : (
              <Text size="md" c="dimmed">No active alerts</Text>
            )}
          </Card>
        </Grid.Col>
      </Grid>
    </Box>
  );
}
