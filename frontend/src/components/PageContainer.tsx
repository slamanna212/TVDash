import { Box, RingProgress, ActionIcon, Group } from '@mantine/core';
import { IconChevronLeft, IconChevronRight } from '@tabler/icons-react';
import { usePageRotation } from '../hooks/usePageRotation';
import { CloudStatusPage } from '../pages/CloudStatusPage';
import { EventsPage } from '../pages/EventsPage';
import { InternetStatusPage } from '../pages/InternetStatusPage';
import { M365WorkspacePage } from '../pages/M365WorkspacePage';
import { PowerGridPage } from '../pages/PowerGridPage';

const pages = [
  { name: 'Internet Status', component: InternetStatusPage },
  { name: 'Cloud Status', component: CloudStatusPage },
  { name: 'M365 & Workspace', component: M365WorkspacePage },
  { name: 'Power Grid', component: PowerGridPage },
  { name: 'Events Timeline', component: EventsPage },
];

export function PageContainer() {
  const { currentPage, progress, goNext, goPrevious } = usePageRotation(pages.length, 45); // Rotate every 45 seconds

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
      {/* Navigation Controls and Progress Ring - Top Right */}
      <Group
        gap="md"
        style={{
          position: 'absolute',
          top: '2vw',
          right: '2vw',
          zIndex: 1000,
        }}
      >
        <ActionIcon
          size={50}
          variant="filled"
          color="dark.6"
          onClick={goPrevious}
          style={{
            border: '2px solid #25262b',
            transition: 'all 0.2s ease',
          }}
          styles={{
            root: {
              '&:hover': {
                backgroundColor: '#25262b',
                transform: 'scale(1.05)',
              },
            },
          }}
        >
          <IconChevronLeft size={28} stroke={2} />
        </ActionIcon>

        <ActionIcon
          size={50}
          variant="filled"
          color="dark.6"
          onClick={goNext}
          style={{
            border: '2px solid #25262b',
            transition: 'all 0.2s ease',
          }}
          styles={{
            root: {
              '&:hover': {
                backgroundColor: '#25262b',
                transform: 'scale(1.05)',
              },
            },
          }}
        >
          <IconChevronRight size={28} stroke={2} />
        </ActionIcon>

        <RingProgress
          size={80}
          thickness={6}
          sections={[{ value: progress, color: '#e53935' }]}
        />
      </Group>

      <CurrentPage />
    </Box>
  );
}
