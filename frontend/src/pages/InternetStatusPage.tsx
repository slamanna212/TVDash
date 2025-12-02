import { Box, Title, Grid, Card, Text, Badge, Stack, Group, Loader, Center, RingProgress } from '@mantine/core';
import { useMemo } from 'react';
import { useAutoRefresh } from '../hooks/useAutoRefresh';
import { apiClient, ISPMetrics } from '../api/client';
import { StatusBadge } from '../components/StatusBadge';
import { statusColors } from '../theme';

function getSecondaryASNsText(secondaryAsns: string | null | undefined): string {
  if (!secondaryAsns) return '';
  try {
    const asns = JSON.parse(secondaryAsns);
    if (Array.isArray(asns) && asns.length > 0) {
      return `, AS${asns.join(', AS')}`;
    }
  } catch (e) {
    // Ignore parse errors
  }
  return '';
}

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
      <Title order={1} style={{ fontSize: 'var(--font-xl)', marginBottom: '2vw' }}>
        Internet Status
      </Title>

      <Grid gutter="xl">
        {data?.isps.map((ispMetrics) => (
          <Grid.Col key={ispMetrics.isp.id} span={4}>
            <ISPCard ispMetrics={ispMetrics} />
          </Grid.Col>
        ))}
      </Grid>
    </Box>
  );
}

function ISPCard({ ispMetrics }: { ispMetrics: ISPMetrics }) {
  // Memoize secondary ASNs text to avoid re-parsing on every render
  const secondaryASNsText = useMemo(
    () => getSecondaryASNsText(ispMetrics.isp.secondary_asns),
    [ispMetrics.isp.secondary_asns]
  );

  const hasIssues = ispMetrics.anomalies.length > 0 || ispMetrics.bgpIncidents.length > 0;

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
        {/* ISP Header */}
        <Group justify="space-between" align="flex-start">
          <Group align="flex-start" gap="md">
            {/* RPKI Validation Stats */}
            {ispMetrics.rpki &&
             ispMetrics.rpki.validPercentage !== null &&
             ispMetrics.rpki.unknownPercentage !== null &&
             ispMetrics.rpki.invalidPercentage !== null ? (
              <Box style={{ textAlign: 'center' }}>
                <RingProgress
                  size={120}
                  thickness={12}
                  sections={[
                    { value: ispMetrics.rpki.validPercentage, color: 'green', tooltip: `Valid: ${ispMetrics.rpki.validPercentage.toFixed(1)}%` },
                    { value: ispMetrics.rpki.unknownPercentage, color: 'gray', tooltip: `Unknown: ${ispMetrics.rpki.unknownPercentage.toFixed(1)}%` },
                    { value: ispMetrics.rpki.invalidPercentage, color: 'red', tooltip: `Invalid: ${ispMetrics.rpki.invalidPercentage.toFixed(1)}%` },
                  ]}
                  label={
                    <Text size="xs" ta="center" fw={700}>
                      BGP
                    </Text>
                  }
                />
              </Box>
            ) : (
              <Box style={{ width: 120, height: 120, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Text size="4rem">🌐</Text>
              </Box>
            )}

            <Box>
              <Text size="calc(var(--font-lg) * 1.2)" fw={700}>
                {ispMetrics.isp.name}
              </Text>
              <Text size="sm" c="dimmed">
                AS{ispMetrics.isp.primary_asn}{secondaryASNsText}
              </Text>
            </Box>
          </Group>

          <StatusBadge status={ispMetrics.status} size="lg" />
        </Group>

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

        {/* Last Checked & Average Latency */}
        <Group justify="space-between" mt="auto">
          <Text size="xs" c="dimmed">
            Last checked: {new Date(ispMetrics.lastChecked).toLocaleTimeString()}
          </Text>
          {ispMetrics.metrics.latencyMs !== null && (
            <Text size="sm" fw={600}>
              Average Latency: {ispMetrics.metrics.latencyMs.toFixed(1)}ms
            </Text>
          )}
        </Group>
      </Stack>
    </Card>
  );
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
