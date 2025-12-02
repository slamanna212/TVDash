import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../api/client';

/**
 * React Query hook for fetching Cloudflare Radar attack data
 *
 * Includes 60-second fallback polling in case SSE fails
 */
export function useRadarAttacks() {
  return useQuery({
    queryKey: ['radar'],
    queryFn: () => apiClient.getRadarAttacks(),
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 60 * 1000, // Fallback: 1 minute
  });
}
