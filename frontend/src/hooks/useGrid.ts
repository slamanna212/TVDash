import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../api/client';

/**
 * React Query hook for fetching power grid status
 *
 * Includes 60-second fallback polling in case SSE fails
 */
export function useGrid() {
  return useQuery({
    queryKey: ['grid'],
    queryFn: () => apiClient.getGrid(),
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 60 * 1000, // Fallback: 1 minute
  });
}
