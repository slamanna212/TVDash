import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../api/client';

/**
 * React Query hook for fetching CISA KEV data
 *
 * Refetch interval: 60 seconds (data updates every 4 hours)
 */
export function useCisaKev() {
  return useQuery({
    queryKey: ['cisa-kev'],
    queryFn: () => apiClient.getCisaKev(),
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 60 * 1000, // 1 minute
  });
}
