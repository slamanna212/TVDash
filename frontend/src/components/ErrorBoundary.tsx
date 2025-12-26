import { Component, ReactNode } from 'react';
import { Box, Title, Text, Button, Stack, Center } from '@mantine/core';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * Error boundary component to catch and handle React errors gracefully.
 * Prevents a single component crash from taking down the entire dashboard.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    console.error('[ErrorBoundary] Caught error:', error);
    console.error('[ErrorBoundary] Component stack:', errorInfo.componentStack);
  }

  handleRetry = (): void => {
    this.setState({ hasError: false, error: null });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <Center style={{ height: '100%', width: '100%', minHeight: '200px' }}>
          <Box
            style={{
              background: 'var(--bg-secondary, #1a1b2e)',
              padding: '2rem',
              borderRadius: '8px',
              maxWidth: '500px',
              textAlign: 'center',
            }}
          >
            <Stack gap="md" align="center">
              <Title order={3} c="red">
                Something went wrong
              </Title>
              <Text size="sm" c="dimmed">
                {this.state.error?.message || 'An unexpected error occurred'}
              </Text>
              <Button
                variant="outline"
                color="red"
                onClick={this.handleRetry}
                size="sm"
              >
                Try Again
              </Button>
            </Stack>
          </Box>
        </Center>
      );
    }

    return this.props.children;
  }
}
