import type { CheckResult, ServiceStatus } from '../types';

/**
 * StatusHub parser for SonicWall and other services using StatusHub
 * This tries multiple common StatusHub API endpoints
 */
export async function checkStatusHubStatus(baseUrl: string): Promise<CheckResult> {
  const startTime = Date.now();

  // Try different possible API endpoints
  const endpoints = [
    '/api/status',
    '/api/v1/status',
    '/api/summary',
  ];

  for (const endpoint of endpoints) {
    try {
      const apiUrl = `${baseUrl.replace(/\/$/, '')}${endpoint}`;
      const response = await fetch(apiUrl, {
        headers: {
          'User-Agent': 'MSP-Dashboard-Monitor/1.0',
          'Accept': 'application/json',
        },
      });

      if (response.ok) {
        const responseTime = Date.now() - startTime;
        const data = await response.json();

        // Parse the response
        const result = parseStatusHubResponse(data);
        return {
          ...result,
          responseTime,
        };
      }
    } catch (error) {
      // Try next endpoint
      continue;
    }
  }

  // If all endpoints failed, fall back to Statuspage format
  // (Some services may use Statuspage even if they appear to use StatusHub)
  try {
    const statuspageUrl = `${baseUrl.replace(/\/$/, '')}/api/v2/summary.json`;
    const response = await fetch(statuspageUrl, {
      headers: {
        'User-Agent': 'MSP-Dashboard-Monitor/1.0',
        'Accept': 'application/json',
      },
    });

    if (response.ok) {
      const responseTime = Date.now() - startTime;
      const data = await response.json();

      // Use Statuspage parser logic
      const status = mapStatuspageIndicator(data.status?.indicator || 'unknown');
      return {
        status,
        responseTime,
        message: data.status?.description || 'Status retrieved',
      };
    }
  } catch (error) {
    // Fallback failed too
  }

  const responseTime = Date.now() - startTime;
  return {
    status: 'unknown',
    responseTime,
    message: 'Could not determine status - API format not recognized',
  };
}

function parseStatusHubResponse(data: any): Pick<CheckResult, 'status' | 'message'> {
  // StatusHub may have different response formats
  // Try to extract status from common fields

  // Check for overall status
  if (data.status) {
    const status = normalizeStatus(data.status);
    return {
      status,
      message: data.message || data.description || 'Status retrieved',
    };
  }

  // Check for indicator (Statuspage-like format)
  if (data.indicator) {
    return {
      status: mapStatuspageIndicator(data.indicator),
      message: data.description || 'Status retrieved',
    };
  }

  // Check for incidents array
  if (Array.isArray(data.incidents)) {
    const hasActiveIncidents = data.incidents.some((inc: any) =>
      inc.status !== 'resolved' && inc.status !== 'postmortem'
    );

    if (hasActiveIncidents) {
      const criticalIncident = data.incidents.find((inc: any) =>
        inc.impact === 'critical' || inc.impact === 'major'
      );

      if (criticalIncident) {
        return {
          status: 'outage',
          message: criticalIncident.name || 'Active incident',
        };
      }

      return {
        status: 'degraded',
        message: 'Minor incidents detected',
      };
    }
  }

  // Default to operational if no issues found
  return {
    status: 'operational',
    message: 'All systems operational',
  };
}

function normalizeStatus(status: string): ServiceStatus {
  const statusLower = status.toLowerCase();

  if (statusLower.includes('operational') || statusLower.includes('up') || statusLower === 'ok') {
    return 'operational';
  }

  if (statusLower.includes('degraded') || statusLower.includes('partial')) {
    return 'degraded';
  }

  if (statusLower.includes('outage') || statusLower.includes('down') || statusLower.includes('major')) {
    return 'outage';
  }

  return 'unknown';
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
