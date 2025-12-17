import { Box } from '@mantine/core';
import { AnimatePresence } from 'framer-motion';
import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { useServices } from '../hooks/useServices';
import { ServiceCard } from './ServiceCard';

export function ServiceTicker() {
  const { data, isLoading } = useServices();
  const services = data?.services || [];

  const scrollRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number | null>(null);
  const positionRef = useRef<number>(0); // Persist position across re-renders
  const lastTimeRef = useRef<number>(performance.now());
  const widthCacheRef = useRef<number>(0); // Cache calculated width to avoid layout thrashing

  // Calculate viewport-relative scroll speed
  const calculateSpeed = useCallback(() => {
    const viewportWidth = window.innerWidth;
    // Base speed: 30px/s at 1920px, scales linearly to 60px/s at 3840px
    return (viewportWidth / 1920) * 0.03;
  }, []);

  const [scrollSpeed, setScrollSpeed] = useState(calculateSpeed);

  // Update speed on window resize with debouncing
  useEffect(() => {
    let timeoutId: number;

    const handleResize = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        setScrollSpeed(calculateSpeed());
      }, 100); // Debounce 100ms
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      clearTimeout(timeoutId);
    };
  }, [calculateSpeed]);

  // Memoize the separated cards to prevent unnecessary re-renders
  const { outageCards, scrollingCards } = useMemo(() => {
    const outage = services.filter(s => s.status === 'outage');
    const scrolling = services.filter(s => s.status !== 'outage');
    return { outageCards: outage, scrollingCards: scrolling };
  }, [services]);

  // Calculate width cache when content changes (avoids layout thrashing in RAF loop)
  useEffect(() => {
    const element = scrollRef.current;
    if (!element || scrollingCards.length === 0) {
      widthCacheRef.current = 0;
      return;
    }

    // Calculate the width of half the content (first set of duplicated cards)
    const children = element.children;
    const halfCount = Math.floor(children.length / 2);
    let halfWidth = 0;
    for (let i = 0; i < halfCount; i++) {
      halfWidth += children[i].getBoundingClientRect().width;
    }
    halfWidth += 16 * halfCount; // Add gap width
    widthCacheRef.current = halfWidth;
  }, [scrollingCards]);

  // Use smooth JavaScript animation instead of CSS to prevent resets
  useEffect(() => {
    const element = scrollRef.current;
    if (!element || scrollingCards.length === 0 || widthCacheRef.current === 0) return;

    const animate = (currentTime: number) => {
      const delta = currentTime - lastTimeRef.current;
      lastTimeRef.current = currentTime;

      positionRef.current -= scrollSpeed * delta;

      // Use cached width instead of recalculating (prevents layout thrashing)
      const halfWidth = widthCacheRef.current;

      // Seamlessly loop when we've scrolled through the first set
      if (Math.abs(positionRef.current) >= halfWidth) {
        positionRef.current = positionRef.current + halfWidth;
      }

      // Use translate3d for hardware acceleration
      element.style.transform = `translate3d(${positionRef.current}px, 0, 0)`;
      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [scrollingCards.length, scrollSpeed]); // Restart if card count or scroll speed changes

  if (isLoading) {
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
      <AnimatePresence mode="popLayout">
        {outageCards.length > 0 && (
          <Box className="outage-cards-static">
            {outageCards.map(service => (
              <ServiceCard
                key={service.id}
                service={service}
                layoutId={`service-${service.id}`}
              />
            ))}
          </Box>
        )}
      </AnimatePresence>

      {/* Scrolling cards */}
      <Box className="ticker-scroll-wrapper">
        <Box ref={scrollRef} className="ticker-scroll-content-js">
          {/* Duplicate cards for seamless loop */}
          {scrollingCards.map(service => (
            <ServiceCard
              key={`a-${service.id}`}
              service={service}
              layoutId={`service-${service.id}`}
            />
          ))}
          {scrollingCards.map(service => (
            <ServiceCard
              key={`b-${service.id}`}
              service={service}
            />
          ))}
        </Box>
      </Box>
    </Box>
  );
}
