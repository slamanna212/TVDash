import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../api/client';

/**
 * React Query hook for fetching services status
 *
 * Includes 30-second fallback polling in case SSE fails
 */
export function useServices() {
  return useQuery({
    queryKey: ['services'],
    queryFn: () => apiClient.getServices(),
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 30 * 1000, // Fallback: 30 seconds
  });
}
