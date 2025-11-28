import { Box, Title, Grid, Card, Text, Badge, Stack, Group, Loader, Center, Progress } from '@mantine/core';
import { useAutoRefresh } from '../hooks/useAutoRefresh';
import { apiClient, ISPMetrics } from '../api/client';
import { StatusBadge } from '../components/StatusBadge';
import { statusColors } from '../theme';

export function InternetStatusPage() {
  const { data, loading, error } = useAutoRefresh(
    () => apiClient.getInternet(),
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
          Error loading internet status: {error.message}
        </Text>
      </Center>
    );
  }

  return (
    <Box style={{ height: '100%', width: '100%' }}>
      <Group justify="space-between" align="flex-start" mb="2vw">
        <Title order={1} style={{ fontSize: 'var(--font-xl)' }}>
          Internet Status
        </Title>
        {data && (
          <Group gap="md">
            <Text size="lg" c="dimmed">Overall:</Text>
            <StatusBadge status={data.overallStatus} size="lg" />
          </Group>
        )}
      </Group>

      <Grid gutter="xl">
        {data?.isps.map((ispMetrics) => (
          <Grid.Col key={ispMetrics.isp.id} span={6}>
            <ISPCard ispMetrics={ispMetrics} />
          </Grid.Col>
        ))}
      </Grid>
    </Box>
  );
}

function ISPCard({ ispMetrics }: { ispMetrics: ISPMetrics }) {
  const hasIssues = ispMetrics.anomalies.length > 0 || ispMetrics.bgpIncidents.length > 0;

  return (
    <Card
      shadow="md"
      padding="lg"
      radius="md"
      style={{
        height: '100%',
        background: 'var(--bg-secondary)',
        border: `2px solid ${statusColors[ispMetrics.status]}`,
      }}
    >
      <Stack gap="md">
        {/* ISP Header */}
        <Group justify="space-between" align="flex-start">
          <Box>
            <Text
              size="calc(var(--font-lg) * 1.2)"
              fw={700}
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
            >
              <span>🌐</span>
              {ispMetrics.isp.name}
            </Text>
            <Text size="sm" c="dimmed">
              AS{ispMetrics.isp.primary_asn}
            </Text>
          </Box>
          <StatusBadge status={ispMetrics.status} size="lg" />
        </Group>

        {/* Quality Metrics */}
        <Stack gap="sm">
          <Text fw={600} size="lg">Internet Quality Index:</Text>

          {ispMetrics.metrics.bandwidthPercentile !== null && (
            <Box>
              <Group justify="space-between" mb="xs">
                <Text size="sm">Bandwidth Percentile</Text>
                <Text size="sm" fw={600}>{ispMetrics.metrics.bandwidthPercentile}th</Text>
              </Group>
              <Progress
                value={ispMetrics.metrics.bandwidthPercentile}
                color={getPercentileColor(ispMetrics.metrics.bandwidthPercentile)}
                size="lg"
              />
            </Box>
          )}

          {ispMetrics.metrics.latencyPercentile !== null && (
            <Box>
              <Group justify="space-between" mb="xs">
                <Text size="sm">Latency Percentile</Text>
                <Text size="sm" fw={600}>{ispMetrics.metrics.latencyPercentile}th</Text>
              </Group>
              <Progress
                value={ispMetrics.metrics.latencyPercentile}
                color={getPercentileColor(ispMetrics.metrics.latencyPercentile)}
                size="lg"
              />
            </Box>
          )}

          {ispMetrics.metrics.jitterMs !== null && (
            <Group justify="space-between">
              <Text size="sm">Jitter</Text>
              <Text size="sm" fw={600}>{ispMetrics.metrics.jitterMs.toFixed(2)} ms</Text>
            </Group>
          )}

          {ispMetrics.metrics.bandwidthPercentile === null &&
           ispMetrics.metrics.latencyPercentile === null && (
            <Text c="dimmed" size="sm">
              No metrics available
            </Text>
          )}
        </Stack>

        {/* Traffic Anomalies */}
        {ispMetrics.anomalies.length > 0 && (
          <Stack gap="sm">
            <Text fw={600} size="lg" c="yellow">
              ⚠️ Traffic Anomalies ({ispMetrics.anomalies.length}):
            </Text>
            {ispMetrics.anomalies.map((anomaly, idx) => (
              <Card
                key={idx}
                padding="sm"
                radius="sm"
                style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  borderLeft: `3px solid ${getSeverityColor(anomaly.severity)}`,
                }}
              >
                <Group justify="space-between">
                  <Text size="sm" fw={600}>{anomaly.type}</Text>
                  <Badge color={getSeverityColor(anomaly.severity)} size="sm">
                    {anomaly.severity}
                  </Badge>
                </Group>
                <Text size="xs" c="dimmed" mt="xs">
                  Since: {new Date(anomaly.startTime).toLocaleString()}
                </Text>
              </Card>
            ))}
          </Stack>
        )}

        {/* BGP Incidents */}
        {ispMetrics.bgpIncidents.length > 0 && (
          <Stack gap="sm">
            <Text fw={600} size="lg" c="red">
              🔴 BGP Incidents ({ispMetrics.bgpIncidents.length}):
            </Text>
            {ispMetrics.bgpIncidents.map((incident, idx) => (
              <Card
                key={idx}
                padding="sm"
                radius="sm"
                style={{
                  background: 'rgba(255, 0, 0, 0.1)',
                  borderLeft: `3px solid ${statusColors.outage}`,
                }}
              >
                <Stack gap="xs">
                  <Group justify="space-between">
                    <Text size="sm" fw={600}>{incident.description}</Text>
                    <Badge color="red" size="sm">
                      {incident.type.toUpperCase()}
                    </Badge>
                  </Group>
                  <Text size="xs" c="dimmed">
                    Since: {new Date(incident.startTime).toLocaleString()}
                  </Text>
                </Stack>
              </Card>
            ))}
          </Stack>
        )}

        {/* All Clear */}
        {!hasIssues && ispMetrics.status === 'operational' && (
          <Text c="dimmed" size="lg">
            ✓ No issues detected
          </Text>
        )}

        {/* Last Checked */}
        <Text size="xs" c="dimmed" mt="auto">
          Last checked: {new Date(ispMetrics.lastChecked).toLocaleTimeString()}
        </Text>
      </Stack>
    </Card>
  );
}

function getPercentileColor(percentile: number): string {
  if (percentile >= 75) return 'green';
  if (percentile >= 50) return 'yellow';
  return 'red';
}

function getSeverityColor(severity: string): string {
  switch (severity.toLowerCase()) {
    case 'high':
    case 'critical':
      return statusColors.outage;
    case 'medium':
    case 'major':
      return statusColors.degraded;
    case 'low':
    case 'minor':
      return statusColors.degraded;
    default:
      return statusColors.unknown;
  }
}
