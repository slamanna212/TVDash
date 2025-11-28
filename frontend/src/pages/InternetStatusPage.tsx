import { Box, Center, Text, Title } from '@mantine/core';

export function InternetStatusPage() {
  return (
    <Box style={{ height: '100%', width: '100%' }}>
      <Title order={1} style={{ fontSize: 'var(--font-xl)', marginBottom: '2vw' }}>
        Internet Status
      </Title>

      <Center style={{ height: '70%' }}>
        <Text size="xl" c="dimmed">
          ISP monitoring and global internet health metrics will be displayed here
        </Text>
      </Center>
    </Box>
  );
}
