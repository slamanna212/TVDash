import { Box, Title, Grid, Card, Text, Stack, Group, Skeleton, Center, SimpleGrid } from '@mantine/core';
import { useMemo } from 'react';
import { LineChart, Line, PieChart, Pie, Cell, ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { useRadarAttacks } from '../hooks/useRadarAttacks';
import { useCountUp } from '../hooks/useCountUp';

const CHART_COLORS = ['#e03131', '#fd7e14', '#fab005', '#82c91e', '#40c057', '#12b886', '#15aabf', '#228be6', '#4c6ef5', '#7950f2'];

// Helper component for animated vector values
function AnimatedVectorValue({ value, color }: { value: number; color: string }) {
  const animatedValue = useCountUp(value, { duration: 600 });
  return (
    <Text size="lg" fw={700} c={color}>
      {animatedValue.toLocaleString()}
    </Text>
  );
}

export function RadarAttacksPage() {
  const { data, isLoading, error } = useRadarAttacks();

  // Animate attack totals
  const layer3Total = useCountUp(data?.layer3.total, { duration: 800 });
  const layer7Total = useCountUp(data?.layer7.total, { duration: 800 });

  // Memoize chart data transformations to prevent recalculation on every render
  const chartData = useMemo(() => {
    if (!data) return { layer3: [], layer7: [] };

    return {
      layer3: data.layer3.timeseries.map(point => ({
        time: new Date(point.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        attacks: point.value,
      })),
      layer7: data.layer7.timeseries.map(point => ({
        time: new Date(point.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        attacks: point.value,
      })),
    };
  }, [data]);

  if (isLoading && !data) {
    return (
      <Box style={{ height: '100%', width: '100%', overflow: 'auto' }}>
        <Title order={1} style={{ fontSize: 'var(--font-xl)', marginBottom: '2vw' }}>
          DDoS Attack Activity
        </Title>
        <SimpleGrid cols={2} mb="2vw" spacing="xl">
          <Skeleton height={100} radius="md" animate />
          <Skeleton height={100} radius="md" animate />
        </SimpleGrid>
        <Grid gutter="xl" mb="2vw">
          <Grid.Col span={6}>
            <Skeleton height={400} radius="md" animate />
          </Grid.Col>
          <Grid.Col span={6}>
            <Skeleton height={400} radius="md" animate />
          </Grid.Col>
        </Grid>
      </Box>
    );
  }

  if (error) {
    return (
      <Center style={{ height: '100%' }}>
        <Text size="xl" c="red">
          Error loading attack data: {error.message}
        </Text>
      </Center>
    );
  }

  if (!data) {
    return (
      <Center style={{ height: '100%' }}>
        <Text size="xl" c="dimmed">
          No attack data available
        </Text>
      </Center>
    );
  }

  return (
    <Box style={{ height: '100%', width: '100%', overflow: 'auto' }}>
      <Title order={1} style={{ fontSize: 'var(--font-xl)', marginBottom: '2vw' }}>
        DDoS Attack Activity
      </Title>

      {/* Summary Cards */}
      <SimpleGrid cols={2} mb="2vw" spacing="xl">
        <Card shadow="md" padding="lg" radius="md" style={{ background: 'var(--bg-secondary)' }}>
          <Stack gap="xs">
            <Text size="sm" c="dimmed">Layer 3 Attacks (24h)</Text>
            <Text size="calc(var(--font-lg) * 1.5)" fw={700} c="red">
              {layer3Total.toLocaleString()}
            </Text>
          </Stack>
        </Card>
        <Card shadow="md" padding="lg" radius="md" style={{ background: 'var(--bg-secondary)' }}>
          <Stack gap="xs">
            <Text size="sm" c="dimmed">Layer 7 Attacks (24h)</Text>
            <Text size="calc(var(--font-lg) * 1.5)" fw={700} c="orange">
              {layer7Total.toLocaleString()}
            </Text>
          </Stack>
        </Card>
      </SimpleGrid>

      {/* Time Series Charts */}
      <Grid gutter="xl" mb="2vw">
        <Grid.Col span={6}>
          <Card shadow="md" padding="lg" radius="md" style={{ background: 'var(--bg-secondary)', height: '400px' }}>
            <Stack gap="md" style={{ height: '100%' }}>
              <Text size="lg" fw={600}>Layer 3 DDoS Attacks</Text>
              {chartData.layer3.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData.layer3}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#444" />
                    <XAxis
                      dataKey="time"
                      stroke="#888"
                      style={{ fontSize: '12px' }}
                      interval="preserveStartEnd"
                    />
                    <YAxis stroke="#888" style={{ fontSize: '12px' }} />
                    <Tooltip
                      contentStyle={{
                        background: '#25262b',
                        border: '1px solid #444',
                        borderRadius: '8px',
                      }}
                    />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="attacks"
                      stroke="#e03131"
                      strokeWidth={2}
                      dot={{ fill: '#e03131', r: 3 }}
                      activeDot={{ r: 5 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <Center style={{ flex: 1 }}>
                  <Text c="dimmed">No data available</Text>
                </Center>
              )}
            </Stack>
          </Card>
        </Grid.Col>

        <Grid.Col span={6}>
          <Card shadow="md" padding="lg" radius="md" style={{ background: 'var(--bg-secondary)', height: '400px' }}>
            <Stack gap="md" style={{ height: '100%' }}>
              <Text size="lg" fw={600}>Layer 7 DDoS Attacks</Text>
              {chartData.layer7.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData.layer7}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#444" />
                    <XAxis
                      dataKey="time"
                      stroke="#888"
                      style={{ fontSize: '12px' }}
                      interval="preserveStartEnd"
                    />
                    <YAxis stroke="#888" style={{ fontSize: '12px' }} />
                    <Tooltip
                      contentStyle={{
                        background: '#25262b',
                        border: '1px solid #444',
                        borderRadius: '8px',
                      }}
                    />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="attacks"
                      stroke="#fd7e14"
                      strokeWidth={2}
                      dot={{ fill: '#fd7e14', r: 3 }}
                      activeDot={{ r: 5 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <Center style={{ flex: 1 }}>
                  <Text c="dimmed">No data available</Text>
                </Center>
              )}
            </Stack>
          </Card>
        </Grid.Col>
      </Grid>

      {/* Attack Breakdown */}
      <Grid gutter="xl">
        <Grid.Col span={6}>
          <Card shadow="md" padding="lg" radius="md" style={{ background: 'var(--bg-secondary)', height: '400px' }}>
            <Stack gap="md" style={{ height: '100%' }}>
              <Text size="lg" fw={600}>Attack Breakdown by IP Version</Text>
              {data.breakdown.byProtocol.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={data.breakdown.byProtocol}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={120}
                      label={(entry) => `${entry.name}: ${entry.value.toLocaleString()}`}
                      fill="#8884d8"
                    >
                      {data.breakdown.byProtocol.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        background: '#25262b',
                        border: '1px solid #444',
                        borderRadius: '8px',
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <Center style={{ flex: 1 }}>
                  <Text c="dimmed">No data available</Text>
                </Center>
              )}
            </Stack>
          </Card>
        </Grid.Col>

        <Grid.Col span={6}>
          <Card shadow="md" padding="lg" radius="md" style={{ background: 'var(--bg-secondary)', height: '400px' }}>
            <Stack gap="md" style={{ height: '100%' }}>
              <Text size="lg" fw={600}>Attack Breakdown by HTTP Method</Text>
              {data.breakdown.byVector.length > 0 ? (
                <Stack gap="sm" style={{ flex: 1, overflow: 'auto' }}>
                  {data.breakdown.byVector.map((vector, index) => (
                    <Card
                      key={index}
                      padding="md"
                      radius="sm"
                      style={{
                        background: 'rgba(255, 255, 255, 0.05)',
                        borderLeft: `4px solid ${CHART_COLORS[index % CHART_COLORS.length]}`,
                      }}
                    >
                      <Group justify="space-between" align="center">
                        <Text size="md" fw={600}>{vector.name}</Text>
                        <AnimatedVectorValue
                          value={vector.value}
                          color={CHART_COLORS[index % CHART_COLORS.length]}
                        />
                      </Group>
                    </Card>
                  ))}
                </Stack>
              ) : (
                <Center style={{ flex: 1 }}>
                  <Text c="dimmed">No data available</Text>
                </Center>
              )}
            </Stack>
          </Card>
        </Grid.Col>
      </Grid>

      {/* Last Updated */}
      <Text size="xs" c="dimmed" mt="1vw" ta="right">
        Last updated: {new Date(data.lastUpdated).toLocaleString()}
      </Text>
    </Box>
  );
}
