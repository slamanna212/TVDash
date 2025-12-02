import { Box } from '@mantine/core';
import { useEffect, useState, useMemo, useRef } from 'react';
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
  const scrollRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number | null>(null);

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

  // Memoize the separated cards to prevent unnecessary re-renders
  const { outageCards, scrollingCards } = useMemo(() => {
    const outage = services.filter(s => s.status === 'outage');
    const scrolling = services.filter(s => s.status !== 'outage');
    return { outageCards: outage, scrollingCards: scrolling };
  }, [services]);

  // Use smooth JavaScript animation instead of CSS to prevent resets
  useEffect(() => {
    const element = scrollRef.current;
    if (!element || scrollingCards.length === 0) return;

    let position = 0;
    let lastTime = performance.now();
    const speed = 0.03; // pixels per millisecond (30 pixels/second)

    const animate = (currentTime: number) => {
      const delta = currentTime - lastTime;
      lastTime = currentTime;

      position -= speed * delta;

      // Reset position when we've scrolled through half the content
      // This creates a seamless loop since we duplicate the cards
      const resetPoint = element.scrollWidth / 2;
      if (Math.abs(position) >= resetPoint) {
        position = 0;
      }

      element.style.transform = `translateX(${position}px)`;
      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [scrollingCards]);

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
        <Box ref={scrollRef} className="ticker-scroll-content-js">
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
