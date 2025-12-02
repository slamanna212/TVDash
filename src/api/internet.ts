import type { Env } from '../types';

interface LocalISP {
  id: number;
  name: string;
  primary_asn: number;
  secondary_asns: string | null;
  display_order: number;
}

export async function getInternetStatus(env: Env): Promise<Response> {
  try {
    // Read from database instead of making external API calls
    const ispsResult = await env.DB.prepare('SELECT * FROM local_isps ORDER BY display_order').all();

    if (!ispsResult.success || !ispsResult.results) {
      throw new Error('Failed to fetch ISPs from database');
    }

    const isps = ispsResult.results as unknown as LocalISP[];

    // Get latest check for each ISP from database
    const ispMetrics = await Promise.all(
      isps.map(async (isp) => {
        const latest = await env.DB.prepare(`
          SELECT status, details, checked_at
          FROM isp_check_history
          WHERE isp_id = ? AND check_type = 'combined'
          ORDER BY checked_at DESC
          LIMIT 1
        `).bind(isp.id).first();

        // Parse details from database
        let parsedDetails = {
          metrics: { latencyMs: null, jitterMs: null },
          rpki: null,
          anomalies: [],
          bgpIncidents: [],
        };

        if (latest?.details) {
          try {
            parsedDetails = JSON.parse(latest.details as string);
          } catch (e) {
            console.error('Error parsing ISP details:', e);
          }
        }

        return {
          isp: {
            id: isp.id,
            name: isp.name,
            primary_asn: isp.primary_asn,
            secondary_asns: isp.secondary_asns,
            display_order: isp.display_order,
          },
          status: latest?.status || 'unknown',
          metrics: parsedDetails.metrics,
          rpki: parsedDetails.rpki,
          anomalies: parsedDetails.anomalies,
          bgpIncidents: parsedDetails.bgpIncidents,
          lastChecked: latest?.checked_at || new Date().toISOString(),
        };
      })
    );

    // Calculate overall internet health
    let overallStatus: 'operational' | 'degraded' | 'outage' | 'unknown' = 'operational';

    const hasOutage = ispMetrics.some(m => m.status === 'outage');
    const hasDegraded = ispMetrics.some(m => m.status === 'degraded');

    if (hasOutage) {
      overallStatus = 'outage';
    } else if (hasDegraded) {
      overallStatus = 'degraded';
    }

    return new Response(JSON.stringify({
      overallStatus,
      isps: ispMetrics,
      lastUpdated: new Date().toISOString(),
    }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error fetching internet status:', error);
    return new Response(JSON.stringify({
      error: 'Failed to fetch internet status',
      message: error instanceof Error ? error.message : 'Unknown error',
      overallStatus: 'unknown',
      isps: [],
      lastUpdated: new Date().toISOString(),
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
