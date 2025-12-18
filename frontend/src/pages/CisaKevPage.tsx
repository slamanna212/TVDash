import {
  Box,
  Title,
  SimpleGrid,
  Card,
  Text,
  Badge,
  Stack,
  Group,
  Skeleton,
  Center,
} from '@mantine/core';
import { motion } from 'framer-motion';
import { useCisaKev } from '../hooks/useCisaKev';

// Animation variants (match RansomwarePage pattern)
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

export function CisaKevPage() {
  const { data, isLoading, error } = useCisaKev();

  // Loading state
  if (isLoading && !data) {
    return (
      <Box style={{ height: '100%', width: '100%' }}>
        <Title order={1} style={{ fontSize: 'var(--font-xl)', marginBottom: '2vw' }}>
          CISA Known Exploited Vulnerabilities
        </Title>
        <SimpleGrid cols={4} spacing="md">
          {Array.from({ length: 12 }).map((_, i) => (
            <Skeleton key={i} height={200} radius="md" animate />
          ))}
        </SimpleGrid>
      </Box>
    );
  }

  // Error state
  if (error) {
    return (
      <Center style={{ height: '100%' }}>
        <Text size="xl" c="red">
          Error loading CISA KEV data: {error.message}
        </Text>
      </Center>
    );
  }

  // Format date for display (YYYY-MM-DD -> Mon DD, YYYY)
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

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
        CISA Known Exploited Vulnerabilities
      </Title>

      <motion.div variants={containerVariants} initial="hidden" animate="visible">
        <SimpleGrid cols={4} spacing="md">
          {data?.vulnerabilities.map((vuln) => (
            <motion.div key={vuln.cveId} variants={cardVariants}>
              <Card
                padding="md"
                radius="md"
                style={{
                  background: 'var(--bg-secondary)',
                  borderLeft: 'var(--border-thick) solid #e53935',
                  minHeight: 'var(--card-height-sm)',
                }}
              >
                <Stack gap="xs">
                  {/* CVE ID Header */}
                  <Group justify="space-between" align="flex-start">
                    <Text fw={700} size="lg" c="#e53935">
                      {vuln.cveId}
                    </Text>
                    {vuln.knownRansomwareUse === 'Known' && (
                      <Badge size="xs" variant="filled" color="red">
                        Ransomware
                      </Badge>
                    )}
                  </Group>

                  {/* Vulnerability Name */}
                  <Text fw={600} size="md" lineClamp={2}>
                    {vuln.vulnerabilityName}
                  </Text>

                  {/* Vendor & Product */}
                  <Group gap="xs">
                    <Badge size="sm" variant="light" color="gray">
                      {vuln.vendorProject}
                    </Badge>
                    <Text size="xs" c="dimmed" truncate>
                      {vuln.product}
                    </Text>
                  </Group>

                  {/* Description */}
                  <Text size="xs" c="dimmed" lineClamp={3}>
                    {vuln.shortDescription}
                  </Text>

                  {/* Date Added */}
                  <Text size="xs" c="dimmed" mt="auto">
                    Added: {formatDate(vuln.dateAdded)}
                  </Text>
                </Stack>
              </Card>
            </motion.div>
          ))}
        </SimpleGrid>
      </motion.div>
    </Box>
  );
}
