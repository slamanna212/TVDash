import { Box, Stack } from '@mantine/core';
import { ServiceTicker } from './ServiceTicker';
import { PageContainer } from './PageContainer';

export function Layout() {
  return (
    <Stack gap={0} style={{ height: '100vh', width: '100vw' }}>
      {/* Main dashboard area - 85% */}
      <Box
        style={{
          height: '88vh',
          width: '100%',
          overflow: 'hidden',
        }}
      >
        <PageContainer />
      </Box>

      {/* Service ticker - 12% */}
      <Box
        style={{
          height: '12vh',
          width: '100%',
          overflow: 'hidden',
          borderTop: '2px solid #25262b',
        }}
      >
        <ServiceTicker />
      </Box>
    </Stack>
  );
}
