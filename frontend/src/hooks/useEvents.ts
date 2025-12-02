import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../api/client';

export interface UseEventsOptions {
  limit?: number;
  severity?: 'info' | 'warning' | 'critical';
  source?: string;
}

/**
 * React Query hook for fetching unified event timeline
 *
 * Includes 60-second fallback polling in case SSE fails
 *
 * @param options - Optional filtering parameters
 */
export function useEvents(options: UseEventsOptions = {}) {
  return useQuery({
    queryKey: ['events', options],
    queryFn: () => apiClient.getEvents(options),
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 60 * 1000, // Fallback: 1 minute
  });
}
