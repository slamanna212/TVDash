import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';

export interface UseSSEOptions {
  url: string;
  onMessage?: (event: MessageEvent) => void;
  onError?: (error: Event) => void;
  reconnectInterval?: number;
}

/**
 * Hook to manage Server-Sent Events (SSE) connection
 *
 * Establishes EventSource connection to receive real-time updates from the server.
 * Automatically invalidates React Query cache when SSE events arrive.
 *
 * Features:
 * - Auto-reconnect on connection loss with exponential backoff
 * - Proper cleanup on component unmount
 * - Invalidates React Query queries based on event type
 *
 * @param options - SSE configuration options
 * @returns Connection status and EventSource instance
 */
export function useSSE({
  url,
  onMessage,
  onError,
  reconnectInterval = 3000,
}: UseSSEOptions) {
  const queryClient = useQueryClient();
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<number | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const [isConnected, setIsConnected] = useState(false);

  // Memoize callbacks to prevent unnecessary reconnections
  const onMessageRef = useRef(onMessage);
  const onErrorRef = useRef(onError);

  useEffect(() => {
    onMessageRef.current = onMessage;
    onErrorRef.current = onError;
  }, [onMessage, onError]);

  useEffect(() => {
    let isMounted = true;

    function connect() {
      if (!isMounted) return;

      console.log('[SSE] Connecting to', url);
      const eventSource = new EventSource(url);
      eventSourceRef.current = eventSource;

      eventSource.addEventListener('open', () => {
        console.log('[SSE] Connection established');
        setIsConnected(true);
        reconnectAttemptsRef.current = 0; // Reset reconnection counter
      });

      eventSource.addEventListener('connected', (event) => {
        console.log('[SSE] Connected event:', event.data);
        const data = JSON.parse(event.data);
        console.log('[SSE] Server timestamp:', data.timestamp);
      });

      // Services update event
      eventSource.addEventListener('services', (event) => {
        console.log('[SSE] Services updated:', event.data);
        void queryClient.invalidateQueries({ queryKey: ['services'] });
        onMessageRef.current?.(event);
      });

      // Cloud status update event
      eventSource.addEventListener('cloud', (event) => {
        console.log('[SSE] Cloud status updated:', event.data);
        void queryClient.invalidateQueries({ queryKey: ['cloud'] });
        onMessageRef.current?.(event);
      });

      // M365 health update event
      eventSource.addEventListener('m365', (event) => {
        console.log('[SSE] M365 health updated:', event.data);
        void queryClient.invalidateQueries({ queryKey: ['m365'] });
        onMessageRef.current?.(event);
      });

      // Internet/ISP update event
      eventSource.addEventListener('internet', (event) => {
        console.log('[SSE] Internet status updated:', event.data);
        void queryClient.invalidateQueries({ queryKey: ['internet'] });
        onMessageRef.current?.(event);
      });

      // Radar attacks update event
      eventSource.addEventListener('radar', (event) => {
        console.log('[SSE] Radar data updated:', event.data);
        void queryClient.invalidateQueries({ queryKey: ['radar'] });
        onMessageRef.current?.(event);
      });

      // Ransomware update event
      eventSource.addEventListener('ransomware', (event) => {
        console.log('[SSE] Ransomware data updated:', event.data);
        void queryClient.invalidateQueries({ queryKey: ['ransomware'] });
        onMessageRef.current?.(event);
      });

      eventSource.onerror = (error) => {
        console.error('[SSE] Connection error:', error);
        setIsConnected(false);
        eventSource.close();
        onErrorRef.current?.(error);

        // Exponential backoff for reconnection
        const backoffTime = Math.min(
          reconnectInterval * Math.pow(2, reconnectAttemptsRef.current),
          30000 // Max 30 seconds
        );
        reconnectAttemptsRef.current++;

        console.log(
          `[SSE] Reconnecting in ${backoffTime / 1000}s (attempt ${reconnectAttemptsRef.current})`
        );

        if (isMounted) {
          reconnectTimeoutRef.current = setTimeout(() => {
            if (isMounted) {
              connect();
            }
          }, backoffTime);
        }
      };
    }

    connect();

    return () => {
      isMounted = false;
      console.log('[SSE] Cleaning up connection');
      eventSourceRef.current?.close();
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [url, queryClient, reconnectInterval]);

  return {
    isConnected,
    eventSource: eventSourceRef.current,
  };
}
