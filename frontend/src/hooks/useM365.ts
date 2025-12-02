import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../api/client';

/**
 * React Query hook for fetching Microsoft 365 health status
 *
 * Includes 60-second fallback polling in case SSE fails
 */
export function useM365() {
  return useQuery({
    queryKey: ['m365'],
    queryFn: () => apiClient.getM365(),
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 60 * 1000, // Fallback: 1 minute
  });
}
