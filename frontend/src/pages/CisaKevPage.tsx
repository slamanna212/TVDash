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
  RingProgress,
  Tooltip,
} from '@mantine/core';
import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
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

// Animated Ring Progress Component
interface AnimatedRingProgressProps {
  score: number | null;
  color: string;
  label: string;
}

function AnimatedRingProgress({ score, color, label }: AnimatedRingProgressProps) {
  const [animatedValue, setAnimatedValue] = useState(0);
  const targetPercentage = score ? (score / 10) * 100 : 100;

  useEffect(() => {
    const startTime = Date.now();
    const duration = 1200; // 1.2 seconds
    const delay = 200; // 0.2 seconds

    const timer = setTimeout(() => {
      const animate = () => {
        const now = Date.now();
        const elapsed = now - startTime - delay;
        const progress = Math.min(elapsed / duration, 1);

        // Ease-out function
        const easeOut = 1 - Math.pow(1 - progress, 3);
        const currentValue = easeOut * targetPercentage;

        setAnimatedValue(currentValue);

        if (progress < 1) {
          requestAnimationFrame(animate);
        }
      };

      animate();
    }, delay);

    return () => clearTimeout(timer);
  }, [targetPercentage]);

  return (
    <RingProgress
      size={60}
      thickness={6}
      sections={[{ value: animatedValue, color }]}
      label={
        <Text size="sm" fw={700} style={{ textAlign: 'center' }} c={color}>
          {label}
        </Text>
      }
    />
  );
}

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

  // Get color for CVSS score based on severity
  const getCvssColor = (score: number): string => {
    if (score < 4.0) return '#2f9e44';  // Green (LOW)
    if (score < 7.0) return '#fab005';  // Yellow (MEDIUM)
    if (score < 9.0) return '#fd7e14';  // Orange (HIGH)
    return '#e53935';                    // Red (CRITICAL)
  };

  // Format CVSS score label
  const formatCvssLabel = (score: number | null): string => {
    if (score === null) return 'N/A';
    return score.toFixed(1);
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
                  minHeight: 'var(--card-height-sm)',
                }}
              >
                <Stack gap="xs">
                  {/* CVE ID Header with CVSS Ring */}
                  <Group justify="space-between" align="center">
                    <Text fw={700} size="xl" c="#e53935">
                      {vuln.cveId}
                    </Text>

                    {/* CVSS Ring Progress - Top Right */}
                    {vuln.cvssScore !== null ? (
                      <Tooltip
                        label={`CVSS ${vuln.cvssVersion || 'Score'}: ${vuln.cvssScore.toFixed(1)} (${vuln.cvssSeverity || 'Unknown'})`}
                        position="left"
                        withArrow
                      >
                        <div>
                          <AnimatedRingProgress
                            score={vuln.cvssScore}
                            color={getCvssColor(vuln.cvssScore)}
                            label={formatCvssLabel(vuln.cvssScore)}
                          />
                        </div>
                      </Tooltip>
                    ) : (
                      <Tooltip
                        label="CVSS score not available"
                        position="left"
                        withArrow
                      >
                        <div>
                          <AnimatedRingProgress
                            score={null}
                            color="#495057"
                            label="N/A"
                          />
                        </div>
                      </Tooltip>
                    )}
                  </Group>

                  {/* Ransomware Badge - Moved below header */}
                  {vuln.knownRansomwareUse === 'Known' && (
                    <Badge size="xs" variant="filled" color="red" style={{ alignSelf: 'flex-start' }}>
                      Ransomware
                    </Badge>
                  )}

                  {/* Vulnerability Name */}
                  <Text fw={700} size="xl" lineClamp={2}>
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
