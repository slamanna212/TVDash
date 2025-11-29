import { Box, Title, Grid, Card, Text, Badge, Stack, Group, Loader, Center } from '@mantine/core';
import { useAutoRefresh } from '../hooks/useAutoRefresh';
import { apiClient, CloudProvider } from '../api/client';
import { StatusBadge } from '../components/StatusBadge';
import { statusColors } from '../theme';

export function CloudStatusPage() {
  const { data, loading, error } = useAutoRefresh(
    () => apiClient.getCloud(),
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
          Error loading cloud status: {error.message}
        </Text>
      </Center>
    );
  }

  return (
    <Box style={{ height: '100%', width: '100%' }}>
      <Title order={1} style={{ fontSize: 'var(--font-xl)', marginBottom: '2vw' }}>
        Cloud Provider Status
      </Title>

      <Grid gutter="xl">
        {data?.providers.map((provider) => (
          <Grid.Col key={provider.name} span={4}>
            <CloudProviderCard provider={provider} />
          </Grid.Col>
        ))}
      </Grid>
    </Box>
  );
}

function CloudProviderCard({ provider }: { provider: CloudProvider }) {
  const getProviderIcon = (name: string) => {
    switch (name) {
      case 'AWS':
        return '☁️';
      case 'Azure':
        return '🔷';
      case 'Google Cloud':
        return '🌥️';
      default:
        return '☁️';
    }
  };

  return (
    <Card
      shadow="md"
      padding="lg"
      radius="md"
      style={{
        height: '100%',
        background: 'var(--bg-secondary)',
      }}
    >
      <Stack gap="md">
        {/* Provider Header */}
        <Group justify="space-between" align="flex-start">
          <Box>
            <Text
              size="calc(var(--font-lg) * 1.2)"
              fw={700}
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
            >
              <span>{getProviderIcon(provider.name)}</span>
              {provider.name}
            </Text>
          </Box>
          <StatusBadge status={provider.status} size="lg" />
        </Group>

        {/* Incidents */}
        {provider.incidents.length === 0 ? (
          <Text c="dimmed" size="lg">
            ✓ All systems operational
          </Text>
        ) : (
          <Stack gap="sm">
            <Text fw={600} size="lg">
              Active Incidents ({provider.incidents.length}):
            </Text>
            {provider.incidents.slice(0, 3).map((incident, idx) => (
              <Card
                key={idx}
                padding="sm"
                radius="sm"
                style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  borderLeft: `3px solid ${getSeverityColor(incident.severity)}`,
                }}
              >
                <Stack gap="xs">
                  <Group justify="space-between">
                    <Text size="sm" fw={600} style={{ flex: 1 }}>
                      {incident.title}
                    </Text>
                    <Badge color={getSeverityColor(incident.severity)} size="sm">
                      {incident.severity}
                    </Badge>
                  </Group>

                  {incident.services && incident.services.length > 0 && (
                    <Text size="xs" c="dimmed">
                      Services: {incident.services.join(', ')}
                    </Text>
                  )}

                  {incident.regions && incident.regions.length > 0 && (
                    <Text size="xs" c="dimmed">
                      Regions: {incident.regions.join(', ')}
                    </Text>
                  )}
                </Stack>
              </Card>
            ))}
            {provider.incidents.length > 3 && (
              <Text size="sm" c="dimmed">
                + {provider.incidents.length - 3} more incidents
              </Text>
            )}
          </Stack>
        )}

        {/* Last Updated */}
        <Text size="xs" c="dimmed" mt="auto">
          Updated: {new Date(provider.lastUpdated).toLocaleTimeString()}
        </Text>
      </Stack>
    </Card>
  );
}

function getSeverityColor(severity: string): string {
  switch (severity.toLowerCase()) {
    case 'critical':
      return statusColors.outage;
    case 'major':
      return statusColors.degraded;
    case 'minor':
      return statusColors.degraded;
    default:
      return statusColors.unknown;
  }
}
