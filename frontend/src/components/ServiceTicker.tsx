import { Box } from '@mantine/core';
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

  // Separate outage cards from scrolling cards
  const outageCards = services.filter(s => s.status === 'outage');
  const scrollingCards = services.filter(s => s.status !== 'outage');

  return (
    <Box className="ticker-container">
      {/* Static outage cards on the left */}
      {outageCards.length > 0 && (
        <Box className="outage-cards-static">
          {outageCards.map(service => (
            <ServiceCard key={service.id} service={service} />
          ))}
        </Box>
      )}

      {/* Scrolling cards */}
      <Box className="ticker-scroll-wrapper">
        <Box className="ticker-scroll-content">
          {/* Duplicate cards for seamless loop */}
          {scrollingCards.map(service => (
            <ServiceCard key={`a-${service.id}`} service={service} />
          ))}
          {scrollingCards.map(service => (
            <ServiceCard key={`b-${service.id}`} service={service} />
          ))}
        </Box>
      </Box>
    </Box>
  );
}
