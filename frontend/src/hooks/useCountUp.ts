import { useEffect, useState, useRef } from 'react';

interface UseCountUpOptions {
  duration?: number; // Duration in milliseconds
  decimals?: number; // Number of decimal places
}

/**
 * Custom hook for animating numbers with count-up effect
 * @param target - The target number to count up to
 * @param options - Configuration options for the animation
 * @returns The current animated value
 */
export function useCountUp(
  target: number | undefined,
  options: UseCountUpOptions = {}
): number {
  const { duration = 800, decimals = 0 } = options;
  const [count, setCount] = useState(target ?? 0);
  const previousTargetRef = useRef(target);

  useEffect(() => {
    if (target === undefined || target === null) {
      return;
    }

    // If target hasn't changed, don't animate
    if (target === previousTargetRef.current) {
      return;
    }

    previousTargetRef.current = target;

    const startValue = count;
    const endValue = target;
    const startTime = performance.now();
    let rafId: number | null = null;

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Easing function: ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);

      const currentValue = startValue + (endValue - startValue) * eased;
      setCount(parseFloat(currentValue.toFixed(decimals)));

      if (progress < 1) {
        rafId = requestAnimationFrame(animate);
      } else {
        setCount(endValue);
        rafId = null;
      }
    };

    rafId = requestAnimationFrame(animate);

    // Cleanup: Cancel RAF on unmount or when dependencies change
    return () => {
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
      }
    };
  }, [target, duration, decimals]);

  return count;
}
