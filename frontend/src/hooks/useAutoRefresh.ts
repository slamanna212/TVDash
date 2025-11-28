import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Hook to automatically fetch and refresh data at a specified interval
 * @param fetcher Function that fetches the data
 * @param intervalSeconds Seconds between refreshes (default: 30)
 * @param initialFetch Whether to fetch immediately on mount (default: true)
 */
export function useAutoRefresh<T>(
  fetcher: () => Promise<T>,
  intervalSeconds: number = 30,
  initialFetch: boolean = true
) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Use ref to store fetcher to avoid infinite loops
  const fetcherRef = useRef(fetcher);
  useEffect(() => {
    fetcherRef.current = fetcher;
  }, [fetcher]);

  const fetchData = useCallback(async () => {
    try {
      setError(null);
      const result = await fetcherRef.current();
      setData(result);
      setLastUpdated(new Date());
      setLoading(false);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (initialFetch) {
      fetchData();
    } else {
      setLoading(false);
    }

    const interval = setInterval(fetchData, intervalSeconds * 1000);

    return () => clearInterval(interval);
  }, [fetchData, intervalSeconds, initialFetch]);

  const refetch = useCallback(() => {
    setLoading(true);
    fetchData();
  }, [fetchData]);

  return {
    data,
    loading,
    error,
    lastUpdated,
    refetch,
  };
}
