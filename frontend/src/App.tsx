import { AppShell } from '@mantine/core';
import './App.css';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Layout } from './components/Layout';
import { useSSE } from './hooks/useSSE';

function App() {
  // Establish global SSE connection for real-time updates
  // SSE events automatically invalidate React Query cache
  const { isConnected } = useSSE({
    url: '/api/stream',
    onMessage: (event) => {
      console.log('[App] SSE update received:', event.type);
    },
    onError: (error) => {
      console.error('[App] SSE error:', error);
    },
  });

  // Log connection status changes
  console.log('[App] SSE connection status:', isConnected ? 'connected' : 'disconnected');

  return (
    <AppShell
      padding={0}
      styles={{
        main: {
          background: '#0a1023',
          height: '100vh',
          overflow: 'hidden',
        },
      }}
    >
      <ErrorBoundary>
        <Layout />
      </ErrorBoundary>
    </AppShell>
  );
}

export default App;
