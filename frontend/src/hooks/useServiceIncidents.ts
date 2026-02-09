import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../api/client';

export function useServiceIncidents(serviceId: number | null) {
  return useQuery({
    queryKey: ['service-incidents', serviceId],
    queryFn: () => apiClient.getServiceIncidents(serviceId!),
    enabled: !!serviceId,
    staleTime: 2 * 60 * 1000, // 2 minutes
    refetchInterval: 2 * 60 * 1000,
  });
}
