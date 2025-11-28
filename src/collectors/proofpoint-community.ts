import type { CheckResult } from '../types';

/**
 * Check Proofpoint's Salesforce Community status page
 * Since this is a dynamic Salesforce Community page, we'll do an HTTP check
 * and try to parse for incident indicators
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

    // Look for common incident indicators in the HTML
    // Salesforce Community pages often include incident data in the page content
    const hasIncident =
      html.toLowerCase().includes('incident') ||
      html.toLowerCase().includes('outage') ||
      html.toLowerCase().includes('degraded') ||
      html.toLowerCase().includes('maintenance');

    // If the page loads successfully and doesn't show obvious incidents, assume operational
    // This is a basic check - may need refinement based on actual page structure
    if (!hasIncident) {
      return {
        status: 'operational',
        message: 'No incidents reported',
        responseTime,
      };
    }

    // If there are incident keywords, mark as degraded
    // Would need more sophisticated parsing to determine if it's an actual outage
    return {
      status: 'degraded',
      message: 'Possible incident detected - check status page',
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
