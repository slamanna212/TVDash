import { Box, RingProgress } from '@mantine/core';
import { usePageRotation } from '../hooks/usePageRotation';
import { InternetStatusPage } from '../pages/InternetStatusPage';
import { CloudStatusPage } from '../pages/CloudStatusPage';
import { M365WorkspacePage } from '../pages/M365WorkspacePage';
import { PowerGridPage } from '../pages/PowerGridPage';
import { EventsPage } from '../pages/EventsPage';

const pages = [
  { name: 'Internet Status', component: InternetStatusPage },
  { name: 'Cloud Status', component: CloudStatusPage },
  { name: 'M365 & Workspace', component: M365WorkspacePage },
  { name: 'Power Grid', component: PowerGridPage },
  { name: 'Events Timeline', component: EventsPage },
];

export function PageContainer() {
  const { currentPage, progress } = usePageRotation(pages.length, 45); // Rotate every 45 seconds

  const CurrentPage = pages[currentPage].component;

  return (
    <Box
      style={{
        height: '100%',
        width: '100%',
        padding: '2vw',
        position: 'relative',
      }}
    >
      {/* Progress Ring - Top Right */}
      <Box
        style={{
          position: 'absolute',
          top: '2vw',
          right: '2vw',
          zIndex: 1000,
        }}
      >
        <RingProgress
          size={80}
          thickness={6}
          sections={[{ value: progress, color: '#e53935' }]}
        />
      </Box>

      <CurrentPage />
    </Box>
  );
}
