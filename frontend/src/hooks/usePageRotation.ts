import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Hook to rotate through pages at a specified interval
 * @param pageCount Number of pages to rotate through
 * @param intervalSeconds Seconds between rotations
 * @returns Object with current page index, progress percentage, and navigation functions
 */
export function usePageRotation(pageCount: number, intervalSeconds: number) {
  const [currentPage, setCurrentPage] = useState(0);
  const [progress, setProgress] = useState(0);
  const startTimeRef = useRef(Date.now());

  const resetTimer = useCallback(() => {
    startTimeRef.current = Date.now();
    setProgress(0);
  }, []);

  const goNext = useCallback(() => {
    setCurrentPage((prev) => (prev + 1) % pageCount);
    resetTimer();
  }, [pageCount, resetTimer]);

  const goPrevious = useCallback(() => {
    setCurrentPage((prev) => (prev - 1 + pageCount) % pageCount);
    resetTimer();
  }, [pageCount, resetTimer]);

  useEffect(() => {
    startTimeRef.current = Date.now();
    let rafId: number;

    // RAF-based progress update (only updates when browser paints, much more efficient)
    const updateProgress = () => {
      const elapsed = Date.now() - startTimeRef.current;
      const newProgress = Math.min((elapsed / (intervalSeconds * 1000)) * 100, 100);
      setProgress(newProgress);

      // Continue updating until rotation completes
      if (elapsed < intervalSeconds * 1000) {
        rafId = requestAnimationFrame(updateProgress);
      }
    };

    rafId = requestAnimationFrame(updateProgress);

    // Rotate page at interval
    const rotationInterval = setInterval(() => {
      setCurrentPage((prev) => (prev + 1) % pageCount);
      startTimeRef.current = Date.now(); // Reset start time for next cycle
      setProgress(0);
      // Restart progress animation
      rafId = requestAnimationFrame(updateProgress);
    }, intervalSeconds * 1000);

    return () => {
      cancelAnimationFrame(rafId);
      clearInterval(rotationInterval);
    };
  }, [pageCount, intervalSeconds]);

  return { currentPage, progress, goNext, goPrevious };
}
