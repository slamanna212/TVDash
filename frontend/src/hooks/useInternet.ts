import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../api/client';

/**
 * React Query hook for fetching internet/ISP status
 *
 * Includes 60-second fallback polling in case SSE fails
 */
export function useInternet() {
  return useQuery({
    queryKey: ['internet'],
    queryFn: () => apiClient.getInternet(),
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 60 * 1000, // Fallback: 1 minute
  });
}
