import {
  Box,
  Title,
  Text,
  Grid,
  SimpleGrid,
  Stack,
  Group,
  Badge,
  Card,
  Skeleton,
  Center,
  RingProgress,
} from '@mantine/core';
import { LineChart } from '@mantine/charts';
import { motion } from 'framer-motion';
import { useMemo, useState, useEffect } from 'react';
import ReactCountryFlag from 'react-country-flag';
import { useRansomware } from '../hooks/useRansomware';
import { getTimeAgo } from '../utils/time';

// Animation variants (match CloudStatusPage pattern)
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
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

export function RansomwarePage() {
  const { data, isLoading, error } = useRansomware();

  // Format chart data for Mantine LineChart
  const chartData = useMemo(() => {
    if (!data?.dailyCounts) return [];
    return data.dailyCounts.map((item) => ({
      date: new Date(item.date).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      }),
      Infections: item.count,
    }));
  }, [data]);

  // Calculate sector percentages for RingProgress (exclude "not found")
  const sectorData = useMemo(() => {
    if (!data?.topSectors || data.topSectors.length === 0) return [];

    // Filter out "not found" sectors
    const validSectors = data.topSectors.filter(
      (s) => s.name.toLowerCase() !== 'not found'
    );

    const total = validSectors.reduce((sum, s) => sum + s.count, 0);
    return validSectors.map((sector) => ({
      ...sector,
      percentage: (sector.count / total) * 100,
    }));
  }, [data]);

  // Animated values for ring progress sections
  const [animatedSections, setAnimatedSections] = useState<number[]>([]);

  // Detect prefers-reduced-motion
  const prefersReducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Animate ring progress sections sequentially
  useEffect(() => {
    if (!sectorData.length) {
      setAnimatedSections([]);
      return;
    }

    // Initialize all sections to 0
    setAnimatedSections(new Array(sectorData.length).fill(0));

    // If user prefers reduced motion, skip animation
    if (prefersReducedMotion) {
      setAnimatedSections(sectorData.map((s) => s.percentage));
      return;
    }

    const timers: NodeJS.Timeout[] = [];

    // Animate each section sequentially with stagger
    sectorData.slice(0, 8).forEach((sector, index) => {
      const startDelay = 500 + index * 150; // Start at 500ms, stagger by 150ms
      const duration = 600; // Animation duration in ms
      const steps = 30; // Number of animation steps
      const stepDuration = duration / steps;
      const increment = sector.percentage / steps;

      // Delay before starting this section's animation
      const startTimer = setTimeout(() => {
        let currentStep = 0;

        const animationInterval = setInterval(() => {
          currentStep++;
          const newValue = Math.min(increment * currentStep, sector.percentage);

          setAnimatedSections((prev) => {
            const updated = [...prev];
            updated[index] = newValue;
            return updated;
          });

          if (currentStep >= steps) {
            clearInterval(animationInterval);
          }
        }, stepDuration);

        timers.push(animationInterval as any);
      }, startDelay);

      timers.push(startTimer);
    });

    // Cleanup timers on unmount or data change
    return () => {
      timers.forEach((timer) => clearTimeout(timer));
    };
  }, [sectorData, prefersReducedMotion]);

  // Loading state
  if (isLoading && !data) {
    return (
      <Box style={{ height: '100%', width: '100%' }}>
        <Title order={1} style={{ fontSize: 'var(--font-xl)', marginBottom: '2vw' }}>
          Ransomware
        </Title>
        <Grid gutter="md">
          <Grid.Col span={12}>
            <Skeleton height={120} radius="md" animate />
          </Grid.Col>
          <Grid.Col span={8}>
            <Skeleton height={300} radius="md" animate />
          </Grid.Col>
          <Grid.Col span={4}>
            <Skeleton height={300} radius="md" animate />
          </Grid.Col>
        </Grid>
      </Box>
    );
  }

  // Error state
  if (error) {
    return (
      <Center style={{ height: '100%' }}>
        <Text size="xl" c="red">
          Error loading ransomware data: {error.message}
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
        scrollbarWidth: 'none',
        msOverflowStyle: 'none',
      }}
    >
      <Title order={1} style={{ fontSize: 'var(--font-xl)', marginBottom: '2vw' }}>
        Ransomware
      </Title>

      <motion.div variants={containerVariants} initial="hidden" animate="visible">
        <Stack gap="md">
          {/* Main Content Row */}
          <Grid gutter="md" align="stretch">
            {/* Stats Column */}
            <Grid.Col span={3}>
              <Stack gap="md" style={{ height: '100%' }}>
                <motion.div variants={cardVariants} style={{ flex: 1 }}>
                  <Card
                    padding="lg"
                    radius="md"
                    style={{ background: 'var(--bg-secondary)', height: '100%' }}
                  >
                    <Group justify="space-between">
                      <div>
                        <Text size="sm" c="dimmed" fw={500}>
                          Total Victims
                        </Text>
                        <Title
                          order={2}
                          style={{ fontSize: 'calc(var(--font-xl) * 1.2)', color: '#e53935' }}
                        >
                          {data?.stats.totalVictims.toLocaleString()}
                        </Title>
                      </div>
                    </Group>
                  </Card>
                </motion.div>

                <motion.div variants={cardVariants} style={{ flex: 1 }}>
                  <Card
                    padding="lg"
                    radius="md"
                    style={{ background: 'var(--bg-secondary)', height: '100%' }}
                  >
                    <Group justify="space-between">
                      <div>
                        <Text size="sm" c="dimmed" fw={500}>
                          Active Groups
                        </Text>
                        <Title
                          order={2}
                          style={{ fontSize: 'calc(var(--font-xl) * 1.2)', color: '#e53935' }}
                        >
                          {data?.stats.totalGroups.toLocaleString()}
                        </Title>
                      </div>
                    </Group>
                  </Card>
                </motion.div>
              </Stack>
            </Grid.Col>

            {/* Line Chart */}
            <Grid.Col span={5}>
              <motion.div variants={cardVariants} style={{ height: '100%' }}>
                <Card
                  padding="lg"
                  radius="md"
                  style={{
                    background: 'var(--bg-secondary)',
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                  }}
                >
                  <Title order={3} size="lg" mb="md">
                    Infections Over Time (30 Days)
                  </Title>
                  <Box style={{ flex: 1, display: 'flex', alignItems: 'center' }}>
                    {chartData.length > 0 ? (
                      <LineChart
                        h="100%"
                        data={chartData}
                        dataKey="date"
                        series={[{ name: 'Infections', color: '#e53935' }]}
                        curveType="monotone"
                        gridAxis="xy"
                        withLegend={false}
                        strokeWidth={2}
                        style={{ width: '100%' }}
                      />
                    ) : (
                      <Center style={{ width: '100%', height: '100%' }}>
                        <Text c="dimmed">No chart data available</Text>
                      </Center>
                    )}
                  </Box>
                </Card>
              </motion.div>
            </Grid.Col>

            {/* Top Sectors */}
            <Grid.Col span={4}>
              <motion.div variants={cardVariants} style={{ height: '100%' }}>
                <Card
                  padding="lg"
                  radius="md"
                  style={{
                    background: 'var(--bg-secondary)',
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                  }}
                >
                  <Title order={3} size="lg" mb="md">
                    Top Sectors
                  </Title>
                  <Box style={{ flex: 1, display: 'flex', alignItems: 'center' }}>
                    <Group align="center" justify="center" gap="xl" style={{ width: '100%' }}>
                      {/* Combined Ring Progress */}
                      <RingProgress
                        size={180}
                        thickness={22}
                        sections={sectorData.slice(0, 8).map((sector, index) => {
                          const colors = [
                            '#e53935', // Red
                            '#ab47bc', // Purple
                            '#5c6bc0', // Indigo
                            '#42a5f5', // Blue
                            '#26c6da', // Cyan
                            '#26a69a', // Teal
                            '#66bb6a', // Green
                            '#ffa726', // Orange
                          ];
                          return {
                            value: animatedSections[index] || 0,
                            color: colors[index % colors.length],
                            tooltip: `${sector.name}: ${sector.count} (${sector.percentage.toFixed(
                              1
                            )}%)`,
                          };
                        })}
                      />

                      {/* Legend */}
                      <Stack gap="xs" style={{ flex: 1 }}>
                        {sectorData.slice(0, 8).map((sector, index) => {
                          const colors = [
                            '#e53935', // Red
                            '#ab47bc', // Purple
                            '#5c6bc0', // Indigo
                            '#42a5f5', // Blue
                            '#26c6da', // Cyan
                            '#26a69a', // Teal
                            '#66bb6a', // Green
                            '#ffa726', // Orange
                          ];
                          return (
                            <Group key={sector.name} gap="xs" wrap="nowrap">
                              <Box
                                style={{
                                  width: 14,
                                  height: 14,
                                  borderRadius: 2,
                                  backgroundColor: colors[index % colors.length],
                                  flexShrink: 0,
                                }}
                              />
                              <Text size="sm" truncate style={{ flex: 1 }}>
                                {sector.name}
                              </Text>
                              <Text size="sm" c="dimmed" style={{ flexShrink: 0 }}>
                                {sector.count}
                              </Text>
                            </Group>
                          );
                        })}
                      </Stack>
                    </Group>
                  </Box>
                </Card>
              </motion.div>
            </Grid.Col>
          </Grid>

          {/* Recent Victims Grid */}
          <Box>
            <Title order={3} size="lg" mb="md">
              Recent Victims
            </Title>
            <SimpleGrid cols={4} spacing="md">
              {data?.recentVictims.slice(0, 12).map((victim) => (
                <motion.div key={victim.id} variants={cardVariants}>
                  <Card
                    padding="md"
                    radius="md"
                    style={{
                      background: 'var(--bg-secondary)',
                      borderLeft: '3px solid #e53935',
                      minHeight: '120px',
                    }}
                  >
                    <Stack gap="xs">
                      <Group justify="space-between" align="flex-start">
                        <Text fw={700} size="sm" style={{ flex: 1 }} lineClamp={2}>
                          {victim.name}
                        </Text>
                        {victim.countryCode && (
                          <ReactCountryFlag
                            countryCode={victim.countryCode}
                            svg
                            style={{ width: '1.5em', height: '1.5em' }}
                          />
                        )}
                      </Group>

                      <Badge size="sm" variant="light" color="red">
                        {victim.group}
                      </Badge>

                      <Text size="xs" c="dimmed">
                        {victim.sector}
                      </Text>

                      <Text size="xs" c="dimmed">
                        {getTimeAgo(victim.discoveredDate)}
                      </Text>
                    </Stack>
                  </Card>
                </motion.div>
              ))}
            </SimpleGrid>
          </Box>
        </Stack>
      </motion.div>
    </Box>
  );
}
