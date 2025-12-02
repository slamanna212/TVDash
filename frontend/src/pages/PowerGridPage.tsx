import { Box, Title, Grid, Card, Text, Stack, Skeleton, Center, RingProgress, Group } from '@mantine/core';
import { IconBolt, IconAlertTriangle } from '@tabler/icons-react';
import { motion } from 'framer-motion';
import { useMemo, useState, useEffect, useRef } from 'react';
import { useGrid } from '../hooks/useGrid';

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

// Status color mapping (extracted to avoid recreating on every render)
const STATUS_COLORS: Record<string, string> = {
  operational: '#2f9e44',  // Green (matches app theme)
  degraded: '#fab005',     // Yellow (matches app theme)
  outage: '#e03131',       // Red (matches app theme)
  unknown: '#495057',      // Gray (matches app theme)
};

// Animation variants for card entry
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15,
    },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      type: 'spring' as const,
      stiffness: 300,
      damping: 24,
    },
  },
};

// Helper component for animated fuel percentage
function AnimatedFuelPercentage({ percentage }: { percentage: number }) {
  return (
    <Text size="sm" fw={600} style={{ whiteSpace: 'nowrap' }}>
      {percentage}%
    </Text>
  );
}

export function PowerGridPage() {
  const { data, isLoading, error } = useGrid();

  // Track if we've animated yet
  const hasAnimated = useRef(false);
  const [showRing, setShowRing] = useState(false);

  // Animated fuel sections for initial fill animation
  const [animatedFuelMix, setAnimatedFuelMix] = useState<Record<string, number>>({});

  useEffect(() => {
    if (!data?.fuel_mix) return;

    if (!hasAnimated.current) {
      // First time: mount with 0, then animate to real values
      hasAnimated.current = true;

      // Initialize to 0
      const zeroedMix = Object.keys(data.fuel_mix).reduce((acc, fuel) => {
        acc[fuel] = 0;
        return acc;
      }, {} as Record<string, number>);
      setAnimatedFuelMix(zeroedMix);

      // Show the ring with 0 values
      setShowRing(true);

      // Use setTimeout to ensure showRing state update is committed first
      setTimeout(() => {
        setAnimatedFuelMix(data.fuel_mix!);
      }, 50);
    } else {
      // Subsequent updates: ensure showRing is true and update values
      if (!showRing) setShowRing(true);
      setAnimatedFuelMix(data.fuel_mix);
    }
  }, [data, showRing]);

  // Memoize fuel mix sections to prevent recalculation on every render
  const fuelSections = useMemo(() => {
    if (!data?.fuel_mix || Object.keys(animatedFuelMix).length === 0) {
      return [];
    }

    return Object.entries(animatedFuelMix).map(([fuel, percentage]) => ({
      value: percentage,
      color: FUEL_CONFIG[fuel]?.color || '#9e9e9e',
      tooltip: `${FUEL_CONFIG[fuel]?.name || fuel}: ${data.fuel_mix![fuel]}%`,
    }));
  }, [animatedFuelMix, data]);

  if (isLoading && !data) {
    return (
      <Box style={{ height: '100%', width: '100%', padding: '1.5vw', overflow: 'auto' }}>
        <Title order={1} style={{ fontSize: 'var(--font-xl)', marginBottom: '1.5vw' }}>
          Power Grid - PJM Region (PA, NJ, DE)
        </Title>
        <Grid gutter="md">
          <Grid.Col span={2}></Grid.Col>
          <Grid.Col span={3}>
            <Skeleton height={250} radius="md" animate />
          </Grid.Col>
          <Grid.Col span={5}>
            <Skeleton height={250} radius="md" animate />
          </Grid.Col>
          <Grid.Col span={2}></Grid.Col>
        </Grid>
      </Box>
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

  if (!data) {
    return (
      <Center style={{ height: '100%' }}>
        <Text size="xl" c="dimmed">
          No grid data available
        </Text>
      </Center>
    );
  }

  const statusColor = STATUS_COLORS[data.status];

  return (
    <Box style={{ height: '100%', width: '100%', padding: '1.5vw', overflow: 'auto' }}>
      <Title order={1} style={{ fontSize: 'var(--font-xl)', marginBottom: '1.5vw' }}>
        Power Grid - PJM Region (PA, NJ, DE)
      </Title>

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <Grid gutter="md">
          {/* Left spacer */}
          <Grid.Col span={2}></Grid.Col>

          {/* Main Status Card */}
          <Grid.Col span={3}>
            <motion.div variants={cardVariants}>
              <Card
                shadow="sm"
                padding="sm"
                style={{
                  backgroundColor: statusColor,
                  height: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Stack align="center" gap="sm" justify="center">
                  <IconBolt size={80} stroke={1.5} />
                  <Title order={2} style={{ fontSize: 'calc(var(--font-lg) * 1.5)' }}>
                    {data.status.toUpperCase()}
                  </Title>
                  <Text size="sm">
                    Last updated: {new Date(data.checked_at).toLocaleTimeString()}
                  </Text>
                </Stack>
              </Card>
            </motion.div>
          </Grid.Col>

          {/* Fuel Mix Ring Progress */}
          <Grid.Col span={5}>
            <motion.div variants={cardVariants}>
              <Card shadow="sm" padding="sm" style={{ height: 'auto' }}>
                {fuelSections.length > 0 && showRing ? (
                  <Group align="center" justify="center" gap="lg" wrap="nowrap">
                    <Box>
                      <RingProgress
                        size={240}
                        thickness={28}
                        sections={fuelSections}
                        transitionDuration={1500}
                        label={
                          <Stack align="center" gap={0}>
                            <Text size="xs" c="dimmed">Generation</Text>
                            <Text size="lg" fw={700}>Sources</Text>
                          </Stack>
                        }
                      />
                    </Box>
                    {/* Legend */}
                    <Stack gap={6} justify="center" style={{ minWidth: '160px' }}>
                      {Object.entries(data.fuel_mix!)
                        .sort(([, a], [, b]) => b - a) // Sort by percentage descending
                        .map(([fuel, percentage]) => (
                        <Group key={fuel} justify="space-between" gap="sm" wrap="nowrap">
                          <Group gap="xs" wrap="nowrap">
                            <Box
                              style={{
                                width: 12,
                                height: 12,
                                borderRadius: 3,
                                backgroundColor: FUEL_CONFIG[fuel]?.color || '#9e9e9e',
                                flexShrink: 0,
                              }}
                            />
                            <Text size="sm" style={{ whiteSpace: 'nowrap' }}>{FUEL_CONFIG[fuel]?.name || fuel}</Text>
                          </Group>
                          <AnimatedFuelPercentage percentage={percentage} />
                        </Group>
                      ))}
                    </Stack>
                  </Group>
                ) : (
                  <Text c="dimmed" size="md" ta="center">Fuel mix data not available</Text>
                )}
              </Card>
            </motion.div>
          </Grid.Col>

          {/* Right spacer */}
          <Grid.Col span={2}></Grid.Col>

          {/* Active Alerts */}
          <Grid.Col span={12}>
            <motion.div variants={cardVariants}>
              <Group mb="md" mt="lg">
                <IconAlertTriangle size={28} />
                <Title order={3} style={{ fontSize: 'var(--font-lg)' }}>
                  Active Alerts
                </Title>
              </Group>
              {data.alerts && data.alerts.length > 0 ? (
                <Stack gap="md">
                  {data.alerts.map((alert, idx) => (
                    <Card
                      key={idx}
                      shadow="sm"
                      padding="md"
                      style={{
                        backgroundColor: '#e03131',
                      }}
                    >
                      <Text size="md" fw={500}>{alert}</Text>
                    </Card>
                  ))}
                </Stack>
              ) : (
                <Text size="md" c="dimmed" ml="md">No active alerts</Text>
              )}
            </motion.div>
          </Grid.Col>
        </Grid>
      </motion.div>
    </Box>
  );
}
