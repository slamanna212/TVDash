import { Box } from '@mantine/core';
import { useEffect, useState } from 'react';
import { Marquee } from '@gfazioli/mantine-marquee';
import '@gfazioli/mantine-marquee/styles.css';
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

  return (
    <Box
      style={{
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        position: 'relative',
      }}
    >
      <Marquee
        w="100%"
        pauseOnHover={false}
        fadeEdges={true}
        fadeEdgesSize="2rem"
        fadeEdgesColor="var(--bg-primary)"
        style={{
          '--marquee-duration': '90s',
          '--marquee-gap': '0px',
        } as React.CSSProperties}
      >
        {services.map((service) => (
          <ServiceCard key={service.id} service={service} />
        ))}
      </Marquee>
    </Box>
  );
}
