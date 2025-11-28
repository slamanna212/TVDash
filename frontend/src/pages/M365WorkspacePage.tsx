import { Box, Center, Text, Title } from '@mantine/core';

export function M365WorkspacePage() {
  return (
    <Box style={{ height: '100%', width: '100%' }}>
      <Title order={1} style={{ fontSize: 'var(--font-xl)', marginBottom: '2vw' }}>
        Microsoft 365 & Google Workspace
      </Title>

      <Center style={{ height: '70%' }}>
        <Text size="xl" c="dimmed">
          M365 and Google Workspace service status will be displayed here
        </Text>
      </Center>
    </Box>
  );
}
