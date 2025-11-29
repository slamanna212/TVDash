import type { Env, LocalISP } from '../../types';
import { fetchWithCache } from '../../utils/cache';

const RADAR_BASE_URL = 'https://api.cloudflare.com/client/v4/radar';

interface ISPMetrics {
  isp: LocalISP;
  status: 'operational' | 'degraded' | 'outage' | 'unknown';
  metrics: {
    latencyMs: number | null;      // Median latency in ms
    jitterMs: number | null;
  };
  rpki: {
    validPercentage: number;       // % of routes that are RPKI valid
    unknownPercentage: number;     // % of routes with unknown RPKI status
    invalidPercentage: number;     // % of routes that are RPKI invalid
  } | null;
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
 * Checks both primary and secondary ASNs
 */
export async function checkISPStatus(env: Env, isp: LocalISP): Promise<ISPMetrics> {
  if (!env.CF_RADAR_API_TOKEN) {
    console.warn('CF_RADAR_API_TOKEN not configured');
    return getUnknownStatus(isp);
  }

  // Parse secondary ASNs from JSON string
  let secondaryASNs: number[] = [];
  if (isp.secondary_asns) {
    try {
      secondaryASNs = JSON.parse(isp.secondary_asns).map((asn: string) => parseInt(asn, 10));
      console.log(`${isp.name}: Parsed secondary ASNs:`, secondaryASNs);
    } catch (error) {
      console.warn(`Failed to parse secondary ASNs for ${isp.name}:`, error);
    }
  }

  // Build cache key that includes all ASNs
  const allASNs = [isp.primary_asn, ...secondaryASNs];
  const cacheKey = `isp-status-${allASNs.join('-')}`;
  console.log(`${isp.name}: Checking ASNs: ${allASNs.join(', ')}`);

  // Cache the ISP status for 5 minutes
  return await fetchWithCache(
    env,
    cacheKey,
    'isp',
    async () => {

      try {
        const headers = {
          'Authorization': `Bearer ${env.CF_RADAR_API_TOKEN}`,
          'Content-Type': 'application/json',
        };

        // Check all ASNs in parallel
        const allResults = await Promise.all(
          allASNs.map(asn => checkSingleASN(asn, headers))
        );

        // Aggregate results from all ASNs
        const aggregated = aggregateASNResults(allResults);

        return {
          isp,
          status: aggregated.status,
          metrics: aggregated.metrics,
          rpki: aggregated.rpki,
          anomalies: aggregated.anomalies,
          bgpIncidents: aggregated.bgpIncidents,
          lastChecked: new Date().toISOString(),
        };
      } catch (error) {
        console.error(`Error checking ISP ${isp.name}:`, error);
        return getUnknownStatus(isp);
      }
    },
    300  // Cache for 5 minutes
  );
}

/**
 * Check a single ASN
 */
async function checkSingleASN(asn: number, headers: Record<string, string>) {
  console.log(`[AS${asn}] Starting checks...`);

  // Fetch IQI (Internet Quality Index) metrics
  const iqiMetrics = await fetchIQIMetrics(asn, headers);

  // Fetch RPKI validation statistics
  const rpkiMetrics = await fetchRPKIMetrics(asn, headers);

  // Check for traffic anomalies
  const anomalies = await fetchTrafficAnomalies(asn, headers);

  // Check for BGP incidents
  const bgpIncidents = await fetchBGPIncidents(asn, headers);

  console.log(`[AS${asn}] Checks complete - RPKI: ${rpkiMetrics ? 'YES' : 'NO'}, Anomalies: ${anomalies.length}, BGP Incidents: ${bgpIncidents.length}`);

  return {
    asn,
    iqiMetrics,
    rpkiMetrics,
    anomalies,
    bgpIncidents,
  };
}

/**
 * Aggregate results from multiple ASNs
 */
function aggregateASNResults(results: Array<{
  asn: number;
  iqiMetrics: { latencyMs: number | null; jitterMs: number | null };
  rpkiMetrics: { validPercentage: number; unknownPercentage: number; invalidPercentage: number } | null;
  anomalies: Array<{ type: string; severity: string; startTime: string; endTime?: string }>;
  bgpIncidents: Array<{ type: 'hijack' | 'leak'; description: string; startTime: string; endTime?: string }>;
}>) {
  // Combine all anomalies and BGP incidents
  const allAnomalies = results.flatMap(r => r.anomalies);
  const allBGPIncidents = results.flatMap(r => r.bgpIncidents);

  // Determine overall status (worst case)
  let status: 'operational' | 'degraded' | 'outage' | 'unknown' = 'operational';

  if (allBGPIncidents.length > 0) {
    status = 'outage'; // BGP incidents are serious
  } else if (allAnomalies.some(a => a.severity === 'high')) {
    status = 'outage';
  } else if (allAnomalies.length > 0) {
    status = 'degraded';
  }

  // Average latency across all ASNs
  const latencies = results
    .map(r => r.iqiMetrics.latencyMs)
    .filter((l): l is number => l !== null);
  const avgLatency = latencies.length > 0
    ? latencies.reduce((sum, l) => sum + l, 0) / latencies.length
    : null;

  // Average RPKI metrics across all ASNs
  const rpkiResults = results
    .map((r, idx) => ({ asn: r.asn, data: r.rpkiMetrics }))
    .filter((r): r is { asn: number; data: NonNullable<typeof r.data> } => r.data !== null);

  console.log(`Aggregating RPKI from ${results.length} ASNs: ${rpkiResults.length} have data`);
  console.log(`ASNs with RPKI data: [${rpkiResults.map(r => r.asn).join(', ')}]`);
  console.log(`ASNs without RPKI data: [${results.filter(r => r.rpkiMetrics === null).map(r => r.asn).join(', ')}]`);

  const avgRPKI = rpkiResults.length > 0
    ? {
        validPercentage: rpkiResults.reduce((sum, r) => sum + r.data.validPercentage, 0) / rpkiResults.length,
        unknownPercentage: rpkiResults.reduce((sum, r) => sum + r.data.unknownPercentage, 0) / rpkiResults.length,
        invalidPercentage: rpkiResults.reduce((sum, r) => sum + r.data.invalidPercentage, 0) / rpkiResults.length,
      }
    : null;

  return {
    status,
    metrics: {
      latencyMs: avgLatency,
      jitterMs: null, // Not available in IQI
    },
    rpki: avgRPKI,
    anomalies: allAnomalies,
    bgpIncidents: allBGPIncidents,
  };
}

async function fetchIQIMetrics(
  asn: number,
  headers: Record<string, string>
): Promise<{
  latencyMs: number | null;
  jitterMs: number | null;
}> {
  try {
    // Fetch latency metrics
    const latencyResponse = await fetch(
      `${RADAR_BASE_URL}/quality/iqi/summary?asn=${asn}&dateRange=1d&metric=latency`,
      { headers }
    );

    let latencyMs: number | null = null;
    if (latencyResponse.ok) {
      const latencyData: any = await latencyResponse.json();
      // API returns actual measurements (ms) at different percentiles, not a percentile ranking
      // Use p50 (median) as the representative value
      const p50 = latencyData.result?.summary_0?.p50;
      if (p50) {
        latencyMs = parseFloat(p50);
      }
    }

    return {
      latencyMs,
      jitterMs: null, // Jitter not available in IQI summary
    };
  } catch (error) {
    console.error('Error fetching IQI metrics:', error);
    return { latencyMs: null, jitterMs: null };
  }
}

async function fetchRPKIMetrics(
  asn: number,
  headers: Record<string, string>
): Promise<{
  validPercentage: number;
  unknownPercentage: number;
  invalidPercentage: number;
} | null> {
  try {
    // Fetch RPKI validation stats for the ASN
    const response = await fetch(
      `${RADAR_BASE_URL}/bgp/routes/stats?asn=${asn}`,
      { headers }
    );

    if (!response.ok) {
      console.warn(`RPKI stats unavailable for AS${asn}: HTTP ${response.status}`);
      return null;
    }

    const data: any = await response.json();

    if (!data.success) {
      console.warn(`RPKI stats API error for AS${asn}:`, data.errors);
      return null;
    }

    if (!data.result?.stats) {
      console.warn(`No RPKI stats data for AS${asn}`);
      return null;
    }

    // Extract RPKI validation counts and calculate percentages
    const stats = data.result.stats;
    const validCount = parseInt(stats.routes_valid || '0', 10);
    const invalidCount = parseInt(stats.routes_invalid || '0', 10);
    const unknownCount = parseInt(stats.routes_unknown || '0', 10);
    const totalCount = parseInt(stats.routes_total || '0', 10);

    if (totalCount === 0) {
      console.warn(`AS${asn} has zero BGP routes in Radar database`);
      return null;
    }

    // Calculate percentages
    const validPercentage = (validCount / totalCount) * 100;
    const unknownPercentage = (unknownCount / totalCount) * 100;
    const invalidPercentage = (invalidCount / totalCount) * 100;

    console.log(`AS${asn} RPKI: ${validPercentage.toFixed(1)}% valid, ${unknownPercentage.toFixed(1)}% unknown, ${invalidPercentage.toFixed(1)}% invalid (${totalCount} routes)`);

    return {
      validPercentage,
      unknownPercentage,
      invalidPercentage,
    };
  } catch (error) {
    console.error(`Error fetching RPKI metrics for AS${asn}:`, error);
    return null;
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

    const data: any = await response.json();

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
      const hijackData: any = await hijackResponse.json();

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
      latencyMs: null,
      jitterMs: null,
    },
    rpki: null,
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

    const isps = result.results as unknown as LocalISP[];

    // Check each ISP in parallel (now uses cache!)
    const metrics = await Promise.all(
      isps.map(isp => checkISPStatus(env, isp))
    );

    return metrics;
  } catch (error) {
    console.error('Error checking all ISPs:', error);
    return [];
  }
}
