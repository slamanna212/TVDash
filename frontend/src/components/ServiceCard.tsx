import { Box, Text } from '@mantine/core';
import { statusColors } from '../theme';

interface ServiceCardProps {
  service: {
    name: string;
    status: 'operational' | 'degraded' | 'outage' | 'unknown';
    statusText?: string;
    responseTime?: number;
  };
}

export function ServiceCard({ service }: ServiceCardProps) {
  const backgroundColor = statusColors[service.status];

  return (
    <Box
      className={service.status === 'outage' ? 'status-outage' : ''}
      style={{
        backgroundColor,
        padding: '1.5vw 2vw',
        borderRadius: '8px',
        minWidth: 'var(--card-min-width)',
        height: '100%',
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
          fontSize: 'var(--font-base)',
          fontWeight: 600,
          color: '#fff',
          textAlign: 'center',
          lineHeight: 1.2,
        }}
      >
        {service.name}
      </Text>
    </Box>
  );
}
