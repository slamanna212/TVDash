import { Box, Center, Text, Title } from '@mantine/core';

export function CloudStatusPage() {
  return (
    <Box style={{ height: '100%', width: '100%' }}>
      <Title order={1} style={{ fontSize: 'var(--font-xl)', marginBottom: '2vw' }}>
        Cloud Status
      </Title>

      <Center style={{ height: '70%' }}>
        <Text size="xl" c="dimmed">
          AWS, Azure, and Google Cloud status will be displayed here
        </Text>
      </Center>
    </Box>
  );
}
