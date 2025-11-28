import type { CheckResult } from '../types';

/**
 * Check StatusGator-based status pages
 * Supports both proofpointstatus.com and statusgator.com pages
 */
export async function checkProofpointCommunityStatus(url: string): Promise<CheckResult> {
  try {
    const startTime = Date.now();
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; StatusMonitor/1.0)',
      },
    });
    const responseTime = Date.now() - startTime;

    if (!response.ok) {
      return {
        status: 'unknown',
        message: `HTTP ${response.status}`,
        responseTime,
      };
    }

    const html = await response.text();
    const htmlLower = html.toLowerCase();

    // Check for various operational indicators
    // - proofpointstatus.com: "All systems operational"
    // - statusgator.com: "currently operational"
    const isOperational =
      htmlLower.includes('all systems operational') ||
      htmlLower.includes('currently operational');

    if (isOperational) {
      return {
        status: 'operational',
        message: 'All systems operational',
        responseTime,
      };
    }

    // If no operational message is found, assume there are incidents
    return {
      status: 'degraded',
      message: 'Incidents detected - check status page',
      responseTime,
    };
  } catch (error) {
    console.error('StatusGator check failed:', error);
    return {
      status: 'unknown',
      message: error instanceof Error ? error.message : 'Check failed',
    };
  }
}
