import type { Env } from '../types';
import { checkAllISPs } from '../collectors/isp/radar-isp';

export async function getInternetStatus(env: Env): Promise<Response> {
  try {
    const ispMetrics = await checkAllISPs(env);

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
