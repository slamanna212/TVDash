import { Box, Title, Stack, Loader, Center, Text, ScrollArea } from '@mantine/core';
import { useAutoRefresh } from '../hooks/useAutoRefresh';
import { apiClient, Event } from '../api/client';
import { EventCard } from '../components/EventCard';
import { DaySeparator } from '../components/DaySeparator';

export function EventsPage() {
  const { data, loading, error } = useAutoRefresh(
    () => apiClient.getEvents({ limit: 100 }),
    60 // Refresh every 60 seconds
  );

  // Group events by day
  const groupEventsByDay = (events: Event[]) => {
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
  };

  const groupedEvents = groupEventsByDay(data?.events || []);
  const sortedDates = Object.keys(groupedEvents).sort((a, b) =>
    new Date(b).getTime() - new Date(a).getTime()
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
