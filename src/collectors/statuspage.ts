import type { CheckResult, ServiceStatus } from '../types';

interface StatuspageResponse {
  status: {
    indicator: string;
    description: string;
  };
  components?: Array<{
    name: string;
    status: string;
  }>;
}

export async function checkStatuspageStatus(statuspageUrl: string): Promise<CheckResult> {
  const startTime = Date.now();

  try {
    // Ensure URL ends with /api/v2/summary.json
    let apiUrl = statuspageUrl;
    if (!apiUrl.endsWith('/api/v2/summary.json')) {
      // Remove trailing slash if present
      apiUrl = apiUrl.replace(/\/$/, '');
      apiUrl = `${apiUrl}/api/v2/summary.json`;
    }

    const response = await fetch(apiUrl, {
      headers: {
        'User-Agent': 'MSP-Dashboard-Monitor/1.0',
        'Accept': 'application/json',
      },
    });

    const responseTime = Date.now() - startTime;

    if (!response.ok) {
      return {
        status: 'unknown',
        responseTime,
        message: `API returned ${response.status}`,
      };
    }

    const data: StatuspageResponse = await response.json();
    const status = mapStatuspageIndicator(data.status.indicator);

    // If overall status is operational, but there are component issues, check those
    let finalStatus = status;
    if (data.components && data.components.length > 0) {
      const componentStatus = determineStatusFromComponents(data.components);
      // Use the worse of the two statuses
      if (statusPriority(componentStatus) > statusPriority(finalStatus)) {
        finalStatus = componentStatus;
      }
    }

    return {
      status: finalStatus,
      responseTime,
      message: data.status.description,
    };
  } catch (error) {
    const responseTime = Date.now() - startTime;
    return {
      status: 'unknown',
      responseTime,
      message: error instanceof Error ? error.message : 'Failed to check status',
    };
  }
}

function mapStatuspageIndicator(indicator: string): ServiceStatus {
  switch (indicator.toLowerCase()) {
    case 'none':
      return 'operational';
    case 'minor':
      return 'degraded';
    case 'major':
    case 'critical':
      return 'outage';
    default:
      return 'unknown';
  }
}

function determineStatusFromComponents(components: Array<{ name: string; status: string }>): ServiceStatus {
  const hasOutage = components.some(c =>
    c.status === 'major_outage' || c.status === 'partial_outage'
  );
  const hasDegraded = components.some(c =>
    c.status === 'degraded_performance' || c.status === 'under_maintenance'
  );

  if (hasOutage) return 'outage';
  if (hasDegraded) return 'degraded';
  return 'operational';
}

function statusPriority(status: ServiceStatus): number {
  const priorities = {
    'unknown': 0,
    'operational': 1,
    'degraded': 2,
    'outage': 3,
  };
  return priorities[status] || 0;
}
