import { Box, Title, Grid, Text, Badge, Stack, Group, Skeleton, Center } from '@mantine/core';
import { motion } from 'framer-motion';
import { useMemo } from 'react';
import type { CloudRegion } from '../api/client';
import { CloudRegionCard } from '../components/CloudRegionCard';
import { useCloud } from '../hooks/useCloud';
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

// Animation variants for card entry
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

export function CloudStatusPage() {
  const { data, isLoading, error } = useCloud();

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

  if (isLoading && !data) {
    return (
      <Box style={{ height: '100%', width: '100%', overflow: 'auto' }} className="cloud-status-container">
        <Title order={1} style={{ fontSize: 'var(--font-xl)', marginBottom: '2vw' }}>
          Cloud Status
        </Title>
        <Grid gutter="md">
          {[1, 2, 3].map((col) => (
            <Grid.Col key={col} span={4}>
              <Stack gap="md">
                {[1, 2, 3, 4].map((row) => (
                  <Skeleton key={row} height={160} radius="md" animate />
                ))}
              </Stack>
            </Grid.Col>
          ))}
        </Grid>
      </Box>
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
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="visible"
            >
              <Stack gap="md">
                {provider.regions.map((region) => (
                  <motion.div key={region.key} variants={cardVariants}>
                    <CloudRegionCard region={region} />
                  </motion.div>
                ))}
              </Stack>
            </motion.div>
          </Grid.Col>
        ))}
      </Grid>
    </Box>
  );
}
