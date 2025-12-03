import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../api/client';

/**
 * React Query hook for fetching ransomware data
 *
 * Includes 60-second fallback polling in case SSE fails
 */
export function useRansomware() {
  return useQuery({
    queryKey: ['ransomware'],
    queryFn: () => apiClient.getRansomware(),
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 60 * 1000, // Fallback: 1 minute
  });
}
