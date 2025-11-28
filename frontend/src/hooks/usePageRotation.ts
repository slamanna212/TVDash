import { useState, useEffect } from 'react';

/**
 * Hook to rotate through pages at a specified interval
 * @param pageCount Number of pages to rotate through
 * @param intervalSeconds Seconds between rotations
 * @returns Object with current page index and progress percentage
 */
export function usePageRotation(pageCount: number, intervalSeconds: number) {
  const [currentPage, setCurrentPage] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let startTime = Date.now();

    // Update progress every 100ms
    const progressInterval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const newProgress = Math.min((elapsed / (intervalSeconds * 1000)) * 100, 100);
      setProgress(newProgress);
    }, 100);

    // Rotate page at interval
    const rotationInterval = setInterval(() => {
      setCurrentPage((prev) => (prev + 1) % pageCount);
      startTime = Date.now(); // Reset start time for next cycle
      setProgress(0);
    }, intervalSeconds * 1000);

    return () => {
      clearInterval(progressInterval);
      clearInterval(rotationInterval);
    };
  }, [pageCount, intervalSeconds]);

  return { currentPage, progress };
}
