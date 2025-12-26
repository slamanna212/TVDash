import { Box, Text } from '@mantine/core';
import { motion } from 'framer-motion';
import { memo } from 'react';
import { statusColors } from '../theme';
import { formatTimeAgo } from '../utils/format';

interface ServiceCardProps {
  service: {
    name: string;
    status: 'operational' | 'degraded' | 'outage' | 'unknown';
    statusText?: string;
    responseTime?: number;
    lastChecked?: string;
    isMaintenance?: boolean;
  };
  layoutId?: string;
}

export const ServiceCard = memo(function ServiceCard({ service, layoutId }: ServiceCardProps) {
  const backgroundColor = service.isMaintenance
    ? statusColors.maintenance
    : statusColors[service.status];
  const timeAgo = formatTimeAgo(service.lastChecked);

  return (
    <Box
      component={motion.div}
      layoutId={layoutId}
      className={service.status === 'outage' ? 'status-outage' : ''}
      initial={false}
      animate={{
        backgroundColor,
      }}
      transition={{
        layout: { type: 'spring', stiffness: 300, damping: 30 },
        backgroundColor: { duration: 0.3 },
      }}
      style={{
        backgroundColor,
        padding: '0 var(--spacing-base)',
        borderRadius: 'var(--radius-md)',
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
          fontSize: 'var(--font-xl)',
          fontWeight: 600,
          color: '#fff',
          textAlign: 'center',
          lineHeight: 1.2,
        }}
      >
        {service.name}
      </Text>
      {service.isMaintenance && (
        <Text
          style={{
            fontSize: 'var(--font-base)',
            fontWeight: 500,
            color: 'rgba(255, 255, 255, 0.95)',
            textAlign: 'center',
            lineHeight: 1,
            marginTop: '0.25vh',
          }}
        >
          🔧 Maintenance
        </Text>
      )}
      <Text
        style={{
          fontSize: 'var(--font-md)',
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
}, (prevProps, nextProps) => {
  // Only re-render if service data or layoutId actually changes
  // Return true if props are equal (skip re-render), false if different (re-render)
  return (
    prevProps.service.name === nextProps.service.name &&
    prevProps.service.status === nextProps.service.status &&
    prevProps.service.statusText === nextProps.service.statusText &&
    prevProps.service.responseTime === nextProps.service.responseTime &&
    prevProps.service.lastChecked === nextProps.service.lastChecked &&
    prevProps.service.isMaintenance === nextProps.service.isMaintenance &&
    prevProps.layoutId === nextProps.layoutId
  );
});
