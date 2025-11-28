import { useState, useEffect } from 'react';

/**
 * Hook to rotate through pages at a specified interval
 * @param pageCount Number of pages to rotate through
 * @param intervalSeconds Seconds between rotations
 * @returns Current page index (0-based)
 */
export function usePageRotation(pageCount: number, intervalSeconds: number): number {
  const [currentPage, setCurrentPage] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentPage((prev) => (prev + 1) % pageCount);
    }, intervalSeconds * 1000);

    return () => clearInterval(interval);
  }, [pageCount, intervalSeconds]);

  return currentPage;
}
