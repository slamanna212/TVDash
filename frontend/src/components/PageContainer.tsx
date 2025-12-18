import { Box, RingProgress, ActionIcon, Group } from '@mantine/core';
import { IconChevronLeft, IconChevronRight } from '@tabler/icons-react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePageRotation } from '../hooks/usePageRotation';
import { CloudStatusPage } from '../pages/CloudStatusPage';
import { EventsPage } from '../pages/EventsPage';
import { InternetStatusPage } from '../pages/InternetStatusPage';
import { M365WorkspacePage } from '../pages/M365WorkspacePage';
import { RansomwarePage } from '../pages/RansomwarePage';
import { CisaKevPage } from '../pages/CisaKevPage';

const pages = [
  { name: 'Internet Status', component: InternetStatusPage },
  { name: 'Cloud Status', component: CloudStatusPage },
  { name: 'M365 & Workspace', component: M365WorkspacePage },
  { name: 'Ransomware', component: RansomwarePage },
  { name: 'CISA KEV', component: CisaKevPage },
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
          size={36}
          variant="filled"
          color="dark.6"
          onClick={goPrevious}
          style={{
            width: 'var(--button-size)',
            height: 'var(--button-size)',
            border: '2px solid #1d2847',
            transition: 'all 0.2s ease',
          }}
          styles={{
            root: {
              '&:hover': {
                backgroundColor: '#1d2847',
                transform: 'scale(1.05)',
              },
            },
          }}
        >
          <Box style={{ fontSize: 'var(--icon-sm)' }}>
            <IconChevronLeft stroke={2} />
          </Box>
        </ActionIcon>

        <ActionIcon
          size={36}
          variant="filled"
          color="dark.6"
          onClick={goNext}
          style={{
            width: 'var(--button-size)',
            height: 'var(--button-size)',
            border: '2px solid #1d2847',
            transition: 'all 0.2s ease',
          }}
          styles={{
            root: {
              '&:hover': {
                backgroundColor: '#1d2847',
                transform: 'scale(1.05)',
              },
            },
          }}
        >
          <Box style={{ fontSize: 'var(--icon-sm)' }}>
            <IconChevronRight stroke={2} />
          </Box>
        </ActionIcon>

        <RingProgress
          size={80}
          thickness={6}
          style={{
            width: 'var(--ring-sm)',
            height: 'var(--ring-sm)',
          }}
          sections={[{ value: progress, color: '#e53935' }]}
        />
      </Group>

      <AnimatePresence mode="wait">
        <motion.div
          key={currentPage}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{
            duration: 0.4,
            ease: 'easeInOut',
          }}
          style={{
            height: '100%',
            width: '100%',
          }}
        >
          <CurrentPage />
        </motion.div>
      </AnimatePresence>
    </Box>
  );
}
