import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../api/client';

/**
 * React Query hook for fetching cloud provider status (AWS, Azure, GCP)
 *
 * Includes 60-second fallback polling in case SSE fails
 */
export function useCloud() {
  return useQuery({
    queryKey: ['cloud'],
    queryFn: () => apiClient.getCloud(),
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 60 * 1000, // Fallback: 1 minute
  });
}
