import { Box, Text } from '@mantine/core';
import { motion } from 'framer-motion';
import { statusColors } from '../theme';

interface ServiceCardProps {
  service: {
    name: string;
    status: 'operational' | 'degraded' | 'outage' | 'unknown';
    statusText?: string;
    responseTime?: number;
    lastChecked?: string;
  };
  layoutId?: string;
}

function formatTimeAgo(timestamp: string | undefined): string {
  if (!timestamp) return 'Never';

  const now = new Date();
  const then = new Date(timestamp);
  const diffMs = now.getTime() - then.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSeconds < 60) {
    return diffSeconds === 1 ? '1 second ago' : `${diffSeconds} seconds ago`;
  } else if (diffMinutes < 60) {
    return diffMinutes === 1 ? '1 minute ago' : `${diffMinutes} minutes ago`;
  } else if (diffHours < 24) {
    return diffHours === 1 ? '1 hour ago' : `${diffHours} hours ago`;
  } else {
    return diffDays === 1 ? '1 day ago' : `${diffDays} days ago`;
  }
}

export function ServiceCard({ service, layoutId }: ServiceCardProps) {
  const backgroundColor = statusColors[service.status];
  const timeAgo = formatTimeAgo(service.lastChecked);

  return (
    <Box
      component={motion.div}
      layoutId={layoutId}
      className={service.status === 'outage' ? 'status-outage' : ''}
      initial={false}
      animate={{
        backgroundColor,
        scale: service.status === 'outage' ? [1, 1.05, 1] : 1,
      }}
      transition={{
        layout: { type: 'spring', stiffness: 300, damping: 30 },
        backgroundColor: { duration: 0.3 },
        scale: { duration: 0.5, times: [0, 0.5, 1] },
      }}
      style={{
        backgroundColor,
        padding: '0 1vw',
        borderRadius: '8px',
        minWidth: 'var(--card-min-width)',
        height: '16vh',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        gap: '0.5vw',
        flexShrink: 0,
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
      }}
    >
      <Text
        style={{
          fontSize: 'var(--font-lg)',
          fontWeight: 600,
          color: '#fff',
          textAlign: 'center',
          lineHeight: 1.2,
        }}
      >
        {service.name}
      </Text>
      <Text
        style={{
          fontSize: 'var(--font-base)',
          fontWeight: 400,
          color: 'rgba(255, 255, 255, 0.8)',
          textAlign: 'center',
          lineHeight: 1,
        }}
      >
        Updated {timeAgo}
      </Text>
    </Box>
  );
}
