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

  const getStatusIcon = () => {
    switch (service.status) {
      case 'operational':
        return '✓';
      case 'degraded':
        return '⚠';
      case 'outage':
        return '✗';
      default:
        return '?';
    }
  };

  return (
    <Box
      className={service.status === 'outage' ? 'status-outage' : ''}
      style={{
        backgroundColor,
        padding: '1vw 1.5vw',
        borderRadius: '8px',
        minWidth: 'var(--card-min-width)',
        height: '80%',
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
          fontSize: 'calc(var(--font-base) * 1.5)',
          fontWeight: 'bold',
          color: '#fff',
          textAlign: 'center',
          lineHeight: 1.2,
        }}
      >
        {getStatusIcon()}
      </Text>

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

      {service.responseTime && (
        <Text
          style={{
            fontSize: 'calc(var(--font-base) * 0.8)',
            color: 'rgba(255, 255, 255, 0.9)',
            textAlign: 'center',
          }}
        >
          {service.responseTime}ms
        </Text>
      )}
    </Box>
  );
}
