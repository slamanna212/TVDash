import { Box, Center, Text, Title } from '@mantine/core';

export function RadarAttacksPage() {
  return (
    <Box style={{ height: '100%', width: '100%' }}>
      <Title order={1} style={{ fontSize: 'var(--font-xl)', marginBottom: '2vw' }}>
        DDoS Attack Activity
      </Title>

      <Center style={{ height: '70%' }}>
        <Text size="xl" c="dimmed">
          Cloudflare Radar attack data and visualizations will be displayed here
        </Text>
      </Center>
    </Box>
  );
}
