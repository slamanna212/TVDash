import { Box, Center, Text } from '@mantine/core';
import { usePageRotation } from '../hooks/usePageRotation';
import { InternetStatusPage } from '../pages/InternetStatusPage';
import { CloudStatusPage } from '../pages/CloudStatusPage';
import { M365WorkspacePage } from '../pages/M365WorkspacePage';
import { RadarAttacksPage } from '../pages/RadarAttacksPage';
import { PowerGridPage } from '../pages/PowerGridPage';
import { EventsPage } from '../pages/EventsPage';

const pages = [
  { name: 'Internet Status', component: InternetStatusPage },
  { name: 'Cloud Status', component: CloudStatusPage },
  { name: 'M365 & Workspace', component: M365WorkspacePage },
  { name: 'Attack Activity', component: RadarAttacksPage },
  { name: 'Power Grid', component: PowerGridPage },
  { name: 'Events Timeline', component: EventsPage },
];

export function PageContainer() {
  const currentPageIndex = usePageRotation(pages.length, 45); // Rotate every 45 seconds

  const CurrentPage = pages[currentPageIndex].component;

  return (
    <Box
      style={{
        height: '100%',
        width: '100%',
        padding: '2vw',
        position: 'relative',
      }}
    >
      <CurrentPage />
    </Box>
  );
}
