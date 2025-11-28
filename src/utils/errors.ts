/**
 * Custom error types for better error handling
 */

export class APIError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public source?: string
  ) {
    super(message);
    this.name = 'APIError';
  }
}

export class DatabaseError extends Error {
  constructor(message: string, public query?: string) {
    super(message);
    this.name = 'DatabaseError';
  }
}

export class ConfigurationError extends Error {
  constructor(message: string, public missingConfig?: string) {
    super(message);
    this.name = 'ConfigurationError';
  }
}

export class CollectorError extends Error {
  constructor(
    message: string,
    public collector: string,
    public serviceId?: number
  ) {
    super(message);
    this.name = 'CollectorError';
  }
}

/**
 * Safely extract error message from unknown error
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === 'string') {
    return error;
  }

  return 'An unknown error occurred';
}

/**
 * Safely extract error stack from unknown error
 */
export function getErrorStack(error: unknown): string | undefined {
  if (error instanceof Error) {
    return error.stack;
  }

  return undefined;
}

/**
 * Create a safe error response object
 */
export function createErrorResponse(error: unknown, context?: string): {
  error: string;
  message: string;
  context?: string;
  statusCode?: number;
} {
  const message = getErrorMessage(error);

  if (error instanceof APIError) {
    return {
      error: error.name,
      message,
      context: error.source || context,
      statusCode: error.statusCode,
    };
  }

  if (error instanceof ConfigurationError) {
    return {
      error: error.name,
      message,
      context: error.missingConfig || context,
      statusCode: 500,
    };
  }

  return {
    error: 'UnknownError',
    message,
    context,
    statusCode: 500,
  };
}

/**
 * Wrap an async function with error handling
 */
export function withErrorHandling<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  context: string
): T {
  return (async (...args: any[]) => {
    try {
      return await fn(...args);
    } catch (error) {
      console.error(`[${context}]`, error);
      throw error;
    }
  }) as T;
}

/**
 * Retry a function with exponential backoff
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  initialDelayMs = 1000,
  maxDelayMs = 10000
): Promise<T> {
  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(getErrorMessage(error));

      if (attempt < maxRetries) {
        const delay = Math.min(initialDelayMs * Math.pow(2, attempt), maxDelayMs);
        console.log(`Retry attempt ${attempt + 1}/${maxRetries} after ${delay}ms`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError || new Error('Retry failed without error');
}

/**
 * Execute with timeout
 */
export async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  errorMessage = 'Operation timed out'
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(errorMessage)), timeoutMs)
    ),
  ]);
}

/**
 * Safe JSON parse with fallback
 */
export function safeJsonParse<T>(json: string, fallback: T): T {
  try {
    return JSON.parse(json) as T;
  } catch (error) {
    console.error('JSON parse error:', error);
    return fallback;
  }
}

/**
 * Log error with context
 */
export function logError(error: unknown, context: Record<string, any> = {}): void {
  const message = getErrorMessage(error);
  const stack = getErrorStack(error);

  console.error('Error occurred:', {
    message,
    stack,
    ...context,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Check if error is a network error
 */
export function isNetworkError(error: unknown): boolean {
  const message = getErrorMessage(error).toLowerCase();
  return (
    message.includes('network') ||
    message.includes('timeout') ||
    message.includes('fetch') ||
    message.includes('enotfound') ||
    message.includes('econnrefused')
  );
}

/**
 * Check if error is a configuration error
 */
export function isConfigError(error: unknown): boolean {
  return error instanceof ConfigurationError ||
    getErrorMessage(error).toLowerCase().includes('not configured');
}
