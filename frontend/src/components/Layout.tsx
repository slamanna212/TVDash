import { Box, Stack } from '@mantine/core';
import { PageContainer } from './PageContainer';
import { ServiceTicker } from './ServiceTicker';

export function Layout() {
  return (
    <Stack gap={0} style={{ height: '100vh', width: '100vw' }}>
      {/* Main dashboard area - 82% */}
      <Box
        style={{
          height: '82vh',
          width: '100%',
          overflow: 'hidden',
        }}
      >
        <PageContainer />
      </Box>

      {/* Service ticker - 18% */}
      <Box
        style={{
          height: '18vh',
          width: '100%',
          overflow: 'hidden',
          borderTop: '2px solid #1d2847',
        }}
      >
        <ServiceTicker />
      </Box>
    </Stack>
  );
}
