import type { Env, LocalISP } from '../../types';

const RADAR_BASE_URL = 'https://api.cloudflare.com/client/v4/radar';

interface ISPMetrics {
  isp: LocalISP;
  status: 'operational' | 'degraded' | 'outage' | 'unknown';
  metrics: {
    bandwidthPercentile: number | null;
    latencyPercentile: number | null;
    jitterMs: number | null;
  };
  anomalies: Array<{
    type: string;
    severity: string;
    startTime: string;
    endTime?: string;
  }>;
  bgpIncidents: Array<{
    type: 'hijack' | 'leak';
    description: string;
    startTime: string;
    endTime?: string;
  }>;
  lastChecked: string;
}

/**
 * Check ISP health using Cloudflare Radar APIs
 */
export async function checkISPStatus(env: Env, isp: LocalISP): Promise<ISPMetrics> {
  if (!env.CF_RADAR_API_TOKEN) {
    console.warn('CF_RADAR_API_TOKEN not configured');
    return getUnknownStatus(isp);
  }

  try {
    const headers = {
      'Authorization': `Bearer ${env.CF_RADAR_API_TOKEN}`,
      'Content-Type': 'application/json',
    };

    // Fetch IQI (Internet Quality Index) metrics
    const iqiMetrics = await fetchIQIMetrics(isp.primary_asn, headers);

    // Check for traffic anomalies
    const anomalies = await fetchTrafficAnomalies(isp.primary_asn, headers);

    // Check for BGP incidents
    const bgpIncidents = await fetchBGPIncidents(isp.primary_asn, headers);

    // Determine overall status
    let status: 'operational' | 'degraded' | 'outage' | 'unknown' = 'operational';

    // If there are active anomalies or BGP incidents, mark as degraded/outage
    if (bgpIncidents.length > 0) {
      status = 'outage'; // BGP incidents are serious
    } else if (anomalies.some(a => a.severity === 'high')) {
      status = 'outage';
    } else if (anomalies.length > 0) {
      status = 'degraded';
    } else if (iqiMetrics.bandwidthPercentile !== null && iqiMetrics.bandwidthPercentile < 50) {
      status = 'degraded';
    }

    return {
      isp,
      status,
      metrics: iqiMetrics,
      anomalies,
      bgpIncidents,
      lastChecked: new Date().toISOString(),
    };
  } catch (error) {
    console.error(`Error checking ISP ${isp.name}:`, error);
    return getUnknownStatus(isp);
  }
}

async function fetchIQIMetrics(
  asn: number,
  headers: Record<string, string>
): Promise<{
  bandwidthPercentile: number | null;
  latencyPercentile: number | null;
  jitterMs: number | null;
}> {
  try {
    // Fetch bandwidth metrics
    const bandwidthResponse = await fetch(
      `${RADAR_BASE_URL}/quality/iqi/summary?asn=${asn}&dateRange=1d&metric=bandwidth`,
      { headers }
    );

    let bandwidthPercentile: number | null = null;
    if (bandwidthResponse.ok) {
      const bandwidthData = await bandwidthResponse.json();
      bandwidthPercentile = bandwidthData.result?.summary_0?.percentile || null;
    }

    // Fetch latency metrics
    const latencyResponse = await fetch(
      `${RADAR_BASE_URL}/quality/iqi/summary?asn=${asn}&dateRange=1d&metric=latency`,
      { headers }
    );

    let latencyPercentile: number | null = null;
    if (latencyResponse.ok) {
      const latencyData = await latencyResponse.json();
      latencyPercentile = latencyData.result?.summary_0?.percentile || null;
    }

    return {
      bandwidthPercentile,
      latencyPercentile,
      jitterMs: null, // Jitter not available in IQI summary
    };
  } catch (error) {
    console.error('Error fetching IQI metrics:', error);
    return { bandwidthPercentile: null, latencyPercentile: null, jitterMs: null };
  }
}

async function fetchTrafficAnomalies(
  asn: number,
  headers: Record<string, string>
): Promise<Array<{ type: string; severity: string; startTime: string; endTime?: string }>> {
  try {
    const response = await fetch(
      `${RADAR_BASE_URL}/traffic_anomalies?asn=${asn}&dateRange=1d`,
      { headers }
    );

    if (!response.ok) {
      return [];
    }

    const data = await response.json();

    if (!data.success || !data.result?.anomalies) {
      return [];
    }

    return data.result.anomalies
      .filter((anomaly: any) => !anomaly.endTime) // Only active anomalies
      .map((anomaly: any) => ({
        type: anomaly.type || 'traffic_drop',
        severity: anomaly.severity || 'medium',
        startTime: anomaly.startTime,
        endTime: anomaly.endTime,
      }));
  } catch (error) {
    console.error('Error fetching traffic anomalies:', error);
    return [];
  }
}

async function fetchBGPIncidents(
  asn: number,
  headers: Record<string, string>
): Promise<Array<{ type: 'hijack' | 'leak'; description: string; startTime: string; endTime?: string }>> {
  try {
    const incidents: Array<{ type: 'hijack' | 'leak'; description: string; startTime: string; endTime?: string }> = [];

    // Check for BGP hijacks
    const hijackResponse = await fetch(
      `${RADAR_BASE_URL}/bgp/hijacks/events?involvedAsn=${asn}&dateRange=7d`,
      { headers }
    );

    if (hijackResponse.ok) {
      const hijackData = await hijackResponse.json();

      if (hijackData.success && hijackData.result?.events) {
        hijackData.result.events
          .filter((event: any) => !event.endTime) // Only active incidents
          .forEach((event: any) => {
            incidents.push({
              type: 'hijack',
              description: `BGP Hijack detected for AS${asn}`,
              startTime: event.startTime,
              endTime: event.endTime,
            });
          });
      }
    }

    // Note: BGP route leak detection disabled - feature is still in beta

    return incidents;
  } catch (error) {
    console.error('Error fetching BGP incidents:', error);
    return [];
  }
}

function getUnknownStatus(isp: LocalISP): ISPMetrics {
  return {
    isp,
    status: 'unknown',
    metrics: {
      bandwidthPercentile: null,
      latencyPercentile: null,
      jitterMs: null,
    },
    anomalies: [],
    bgpIncidents: [],
    lastChecked: new Date().toISOString(),
  };
}

/**
 * Check all configured ISPs
 */
export async function checkAllISPs(env: Env): Promise<ISPMetrics[]> {
  try {
    // Get all ISPs from database
    const result = await env.DB.prepare('SELECT * FROM local_isps ORDER BY display_order').all();

    if (!result.success || !result.results) {
      return [];
    }

    const isps = result.results as LocalISP[];

    // Check each ISP in parallel
    const metrics = await Promise.all(
      isps.map(isp => checkISPStatus(env, isp))
    );

    // Store results in database
    for (const metric of metrics) {
      await env.DB.prepare(`
        INSERT INTO isp_check_history (isp_id, check_type, status, response_time_ms, details, checked_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `).bind(
        metric.isp.id,
        'combined',
        metric.status,
        null,
        JSON.stringify({
          metrics: metric.metrics,
          anomalies: metric.anomalies,
          bgpIncidents: metric.bgpIncidents,
        }),
        metric.lastChecked
      ).run();
    }

    return metrics;
  } catch (error) {
    console.error('Error checking all ISPs:', error);
    return [];
  }
}
