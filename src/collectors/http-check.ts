import type { CheckResult } from '../types';

export async function performHttpCheck(url: string, timeout = 10000): Promise<CheckResult> {
  const startTime = Date.now();

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    const response = await fetch(url, {
      method: 'GET',
      signal: controller.signal,
      headers: {
        'User-Agent': 'MSP-Dashboard-Monitor/1.0',
      },
    });

    clearTimeout(timeoutId);
    const responseTime = Date.now() - startTime;

    if (response.ok) {
      return {
        status: 'operational',
        responseTime,
        message: `HTTP ${response.status} - ${responseTime}ms`,
      };
    } else if (response.status >= 500) {
      return {
        status: 'outage',
        responseTime,
        message: `HTTP ${response.status} - Server Error`,
      };
    } else if (response.status >= 400) {
      return {
        status: 'degraded',
        responseTime,
        message: `HTTP ${response.status} - Client Error`,
      };
    } else {
      return {
        status: 'degraded',
        responseTime,
        message: `HTTP ${response.status}`,
      };
    }
  } catch (error) {
    const responseTime = Date.now() - startTime;

    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        return {
          status: 'outage',
          responseTime: timeout,
          message: 'Request timeout',
        };
      }

      return {
        status: 'outage',
        responseTime,
        message: error.message || 'Connection failed',
      };
    }

    return {
      status: 'unknown',
      responseTime,
      message: 'Unknown error occurred',
    };
  }
}
