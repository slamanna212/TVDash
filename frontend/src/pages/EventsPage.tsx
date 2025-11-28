import { Box, Center, Text, Title } from '@mantine/core';

export function EventsPage() {
  return (
    <Box style={{ height: '100%', width: '100%' }}>
      <Title order={1} style={{ fontSize: 'var(--font-xl)', marginBottom: '2vw' }}>
        Events Timeline
      </Title>

      <Center style={{ height: '70%' }}>
        <Text size="xl" c="dimmed">
          Unified event timeline will be displayed here
        </Text>
      </Center>
    </Box>
  );
}
