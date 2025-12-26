import { Box, Title, Text, Skeleton, Center, SimpleGrid, Loader } from '@mantine/core';
import { motion, AnimatePresence } from 'framer-motion';
import { useMemo } from 'react';
import type { M365Service } from '../api/client';
import { M365ServiceCard } from '../components/M365ServiceCard';
import { useM365 } from '../hooks/useM365';

// Status priority for sorting (extracted to avoid recreating on every render)
const statusPriority: Record<string, number> = {
  outage: 0,
  degraded: 1,
  operational: 2,
  unknown: 3,
};

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

export function M365WorkspacePage() {
  const { data: m365Data, isLoading: m365Loading, isFetching: m365Fetching, error: m365Error } = useM365();

  if (m365Loading && !m365Data) {
    return (
      <Box style={{ height: '100%', width: '100%' }}>
        <Title order={1} style={{ fontSize: 'var(--font-xl)', marginBottom: '2vw' }}>
          Microsoft 365
        </Title>
        <SimpleGrid cols={5} spacing="md">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((i) => (
            <Skeleton
              key={i}
              height={180}
              radius="md"
              animate
              style={{ height: 'var(--card-height-max)' }}
            />
          ))}
        </SimpleGrid>
      </Box>
    );
  }

  return (
    <Box style={{ height: '100%', width: '100%', position: 'relative' }}>
      <Box style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2vw' }}>
        <Title order={1} style={{ fontSize: 'var(--font-xl)' }}>
          Microsoft 365
        </Title>
        <AnimatePresence>
          {m365Fetching && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.2 }}
            >
              <Loader size="sm" color="blue" />
            </motion.div>
          )}
        </AnimatePresence>
      </Box>

      <M365Section data={m365Data} error={m365Error} />
    </Box>
  );
}

function M365Section({ data, error }: { data: any; error: Error | null }) {
  // Memoize sorted services to prevent re-sorting on every render
  const sortedServices = useMemo(
    () => data?.services
      ? [...data.services].sort((a: M365Service, b: M365Service) =>
          statusPriority[a.status] - statusPriority[b.status]
        )
      : [],
    [data]
  );

  if (error) {
    return (
      <Box style={{ padding: 'lg', height: '100%' }}>
        <Text c="red">M365 credentials not configured</Text>
        <Text size="sm" c="dimmed" mt="sm">
          Configure M365_TENANT_ID, M365_CLIENT_ID, and M365_CLIENT_SECRET to enable M365 monitoring
        </Text>
      </Box>
    );
  }

  return (
    <Box style={{ height: '100%' }}>
      {sortedServices.length > 0 ? (
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          <SimpleGrid cols={5} spacing="md" verticalSpacing="md">
            {sortedServices.map((service: M365Service) => (
              <motion.div key={service.name} variants={cardVariants}>
                <M365ServiceCard
                  service={service}
                  updatedAt={data.lastChecked}
                />
              </motion.div>
            ))}
          </SimpleGrid>
        </motion.div>
      ) : (
        <Center style={{ height: '100%' }}>
          <Text c="dimmed">No M365 data available</Text>
        </Center>
      )}
    </Box>
  );
}
