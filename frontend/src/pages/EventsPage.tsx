import { Box, Title, Stack, Center, Text, ScrollArea, Skeleton } from '@mantine/core';
import { motion } from 'framer-motion';
import { useMemo } from 'react';
import type { Event } from '../api/client';
import { DaySeparator } from '../components/DaySeparator';
import { EventCard } from '../components/EventCard';
import { useEvents } from '../hooks/useEvents';

// Helper function to group events by day (extracted to avoid recreating on every render)
function groupEventsByDay(events: Event[]): { [key: string]: Event[] } {
  const groups: { [key: string]: Event[] } = {};

  events.forEach((event) => {
    const date = new Date(event.occurred_at);
    const dateKey = date.toDateString();

    if (!groups[dateKey]) {
      groups[dateKey] = [];
    }
    groups[dateKey].push(event);
  });

  return groups;
}

// Animation variants for card entry
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
    },
  },
};

const cardVariants = {
  hidden: { opacity: 0, x: -20 },
  visible: {
    opacity: 1,
    x: 0,
    transition: {
      type: 'spring' as const,
      stiffness: 300,
      damping: 24,
    },
  },
};

export function EventsPage() {
  const { data, isLoading, error } = useEvents({ limit: 100 });

  // Memoize grouped events to prevent re-grouping on every render
  const groupedEvents = useMemo(
    () => groupEventsByDay(data?.events || []),
    [data]
  );

  // Memoize sorted dates to prevent re-sorting on every render
  const sortedDates = useMemo(
    () => Object.keys(groupedEvents).sort((a, b) =>
      new Date(b).getTime() - new Date(a).getTime()
    ),
    [groupedEvents]
  );

  if (isLoading && !data) {
    return (
      <Box style={{ height: '100%', width: '100%', display: 'flex', flexDirection: 'column' }}>
        <Title order={1} style={{ fontSize: 'var(--font-xl)', marginBottom: '2vw' }}>
          Events Timeline
        </Title>
        <Stack gap="md" pb="xl">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} height={120} radius="md" animate />
          ))}
        </Stack>
      </Box>
    );
  }

  if (error) {
    return (
      <Center style={{ height: '100%' }}>
        <Text size="xl" c="red">
          Error loading events: {error.message}
        </Text>
      </Center>
    );
  }

  return (
    <Box style={{ height: '100%', width: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <Title order={1} style={{ fontSize: 'var(--font-xl)', marginBottom: '2vw' }}>
        Events Timeline
      </Title>

      {/* Timeline */}
      <ScrollArea
        style={{ flex: 1 }}
        offsetScrollbars
        scrollbarSize={8}
      >
        {sortedDates.length === 0 ? (
          <Center style={{ height: '100%', paddingTop: '4rem' }}>
            <Text size="xl" c="dimmed">
              No events to display
            </Text>
          </Center>
        ) : (
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            <Stack gap="md" pb="xl">
              {sortedDates.map((dateKey) => (
                <div key={dateKey}>
                  <DaySeparator date={new Date(dateKey)} />
                  <Stack gap="md">
                    {groupedEvents[dateKey].map((event) => (
                      <motion.div key={event.id} variants={cardVariants}>
                        <EventCard event={event} />
                      </motion.div>
                    ))}
                  </Stack>
                </div>
              ))}
            </Stack>
          </motion.div>
        )}
      </ScrollArea>
    </Box>
  );
}
