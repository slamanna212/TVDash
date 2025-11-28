import type { CheckResult } from '../types';

/**
 * Check Proofpoint's unofficial status page (proofpointstatus.com)
 * This is easier to parse than the official Salesforce Community page
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

    // Look for the "all systems operational" message
    // When operational, the unofficial status page shows: "All systems operational"
    const isOperational = html.toLowerCase().includes('all systems operational');

    if (isOperational) {
      return {
        status: 'operational',
        message: 'All systems operational',
        responseTime,
      };
    }

    // If the "all systems operational" message is not found, assume there are incidents
    return {
      status: 'degraded',
      message: 'Incidents detected - check status page',
      responseTime,
    };
  } catch (error) {
    console.error('Proofpoint Community check failed:', error);
    return {
      status: 'unknown',
      message: error instanceof Error ? error.message : 'Check failed',
    };
  }
}
