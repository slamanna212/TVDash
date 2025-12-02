import { Box, Title, Stack, Loader, Center, Text, ScrollArea } from '@mantine/core';
import { useMemo } from 'react';
import type { Event } from '../api/client';
import { apiClient } from '../api/client';
import { DaySeparator } from '../components/DaySeparator';
import { EventCard } from '../components/EventCard';
import { useAutoRefresh } from '../hooks/useAutoRefresh';

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

export function EventsPage() {
  const { data, loading, error } = useAutoRefresh(
    () => apiClient.getEvents({ limit: 100 }),
    60 // Refresh every 60 seconds
  );

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
          <Stack gap="md" pb="xl">
            {sortedDates.map((dateKey) => (
              <div key={dateKey}>
                <DaySeparator date={new Date(dateKey)} />
                <Stack gap="md">
                  {groupedEvents[dateKey].map((event) => (
                    <EventCard key={event.id} event={event} />
                  ))}
                </Stack>
              </div>
            ))}
          </Stack>
        )}
      </ScrollArea>
    </Box>
  );
}
