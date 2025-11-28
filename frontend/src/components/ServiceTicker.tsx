import { Box, Group } from '@mantine/core';
import { useEffect, useState } from 'react';
import { ServiceCard } from './ServiceCard';

interface ServiceStatus {
  id: number;
  name: string;
  status: 'operational' | 'degraded' | 'outage' | 'unknown';
  statusText?: string;
  responseTime?: number;
  lastChecked: string;
}

export function ServiceTicker() {
  const [services, setServices] = useState<ServiceStatus[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchServices();
    const interval = setInterval(fetchServices, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchServices = async () => {
    try {
      const response = await fetch('/api/services');
      const data = await response.json();
      if (data.services) {
        setServices(data.services);
        setLoading(false);
      }
    } catch (error) {
      console.error('Error fetching services:', error);
    }
  };

  if (loading) {
    return (
      <Box
        style={{
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 'var(--font-lg)',
          color: 'var(--text-secondary)',
        }}
      >
        Loading services...
      </Box>
    );
  }

  // Duplicate services for seamless loop
  const duplicatedServices = [...services, ...services];

  return (
    <Box
      style={{
        height: '100%',
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      <Group
        className="ticker-track"
        gap="md"
        style={{
          height: '100%',
          flexWrap: 'nowrap',
          padding: '1vw 0',
        }}
      >
        {duplicatedServices.map((service, index) => (
          <ServiceCard key={`${service.id}-${index}`} service={service} />
        ))}
      </Group>
    </Box>
  );
}
