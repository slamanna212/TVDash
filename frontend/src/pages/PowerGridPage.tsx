import { Box, Center, Text, Title } from '@mantine/core';

export function PowerGridPage() {
  return (
    <Box style={{ height: '100%', width: '100%' }}>
      <Title order={1} style={{ fontSize: 'var(--font-xl)', marginBottom: '2vw' }}>
        Power Grid Status
      </Title>

      <Center style={{ height: '70%' }}>
        <Text size="xl" c="dimmed">
          PJM grid status and generation mix will be displayed here
        </Text>
      </Center>
    </Box>
  );
}
