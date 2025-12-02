import { QueryClient } from '@tanstack/react-query';

/**
 * TanStack Query client configuration
 *
 * Configured for a 4K TV dashboard with:
 * - 5-minute stale time (matches backend cron interval)
 * - 10-minute garbage collection
 * - No refetch on window focus (24/7 display)
 * - Auto refetch on reconnect
 * - Exponential backoff retry strategy
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Data is fresh for 5 minutes (matches cron schedule)
      staleTime: 5 * 60 * 1000,

      // Keep unused data in cache for 10 minutes
      gcTime: 10 * 60 * 1000,

      // Don't refetch on window focus (TV display stays focused)
      refetchOnWindowFocus: false,

      // Refetch when network reconnects
      refetchOnReconnect: true,

      // Retry failed requests up to 3 times
      retry: 3,

      // Exponential backoff: 1s, 2s, 4s, up to max 30s
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    },
  },
});
