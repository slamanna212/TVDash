import type { Env } from '../../types';
import { fetchWithCache } from '../../utils/cache';
import { createEvent } from '../../db/queries';
import { EVENT_TYPES, RADAR_ATTACK_THRESHOLD } from '../../config/events';

const RADAR_BASE_URL = 'https://api.cloudflare.com/client/v4/radar';

interface RadarTimeseriesResponse {
  result: {
    meta: {
      dateRange: {
        startTime: string;
        endTime: string;
      };
    };
    serie_0: {
      timestamps: string[];
      values: string[];
    };
  };
  success: boolean;
}

interface RadarSummaryResponse {
  result: {
    meta: any;
    summary_0: Record<string, string>;
  };
  success: boolean;
}

export interface AttackData {
  layer3: {
    timeseries: Array<{
      timestamp: string;
      value: number;
    }>;
    total: number;
  };
  layer7: {
    timeseries: Array<{
      timestamp: string;
      value: number;
    }>;
    total: number;
  };
  breakdown: {
    byProtocol: Array<{
      name: string;
      value: number;
    }>;
    byVector: Array<{
      name: string;
      value: number;
    }>;
  };
  lastUpdated: string;
}

function convertSummaryToArray(summary: Record<string, string>): Array<{ name: string; value: number }> {
  return Object.entries(summary).map(([name, value]) => ({
    name,
    value: parseInt(value),
  }));
}

export async function collectAttackData(env: Env): Promise<AttackData> {
  if (!env.CF_RADAR_API_TOKEN) {
    console.warn('CF_RADAR_API_TOKEN not configured, returning empty attack data');
    return getEmptyAttackData();
  }

  try {
    return await fetchWithCache(
      env,
      'radar-attacks',
      'radar',
      async () => {
        const headers = {
          'Authorization': `Bearer ${env.CF_RADAR_API_TOKEN}`,
          'Content-Type': 'application/json',
        };

        // Fetch Layer 3 attack data (last 24 hours)
        const layer3Response = await fetch(
          `${RADAR_BASE_URL}/attacks/layer3/timeseries?dateRange=1d&aggInterval=1h`,
          { headers }
        );

        if (!layer3Response.ok) {
          throw new Error(`Layer 3 API returned ${layer3Response.status}`);
        }

        const layer3Data: RadarTimeseriesResponse = await layer3Response.json();

        // Fetch Layer 7 attack data
        const layer7Response = await fetch(
          `${RADAR_BASE_URL}/attacks/layer7/timeseries?dateRange=1d&aggInterval=1h`,
          { headers }
        );

        if (!layer7Response.ok) {
          throw new Error(`Layer 7 API returned ${layer7Response.status}`);
        }

        const layer7Data: RadarTimeseriesResponse = await layer7Response.json();

        // Fetch attack breakdown by protocol
        const protocolResponse = await fetch(
          `${RADAR_BASE_URL}/attacks/layer7/summary/ip_version?dateRange=1d`,
          { headers }
        );

        const protocolData: RadarSummaryResponse = protocolResponse.ok
          ? await protocolResponse.json()
          : { result: { meta: {}, summary_0: {} }, success: false };

        // Fetch attack breakdown by vector
        const vectorResponse = await fetch(
          `${RADAR_BASE_URL}/attacks/layer7/summary/http_method?dateRange=1d`,
          { headers }
        );

        const vectorData: RadarSummaryResponse = vectorResponse.ok
          ? await vectorResponse.json()
          : { result: { meta: {}, summary_0: {} }, success: false };

        // Process Layer 3 data
        const layer3Timeseries = layer3Data.result.serie_0.timestamps.map((timestamp, index) => ({
          timestamp,
          value: parseInt(layer3Data.result.serie_0.values[index]),
        }));

        const layer3Total = layer3Timeseries.reduce((sum, point) => sum + point.value, 0);

        // Process Layer 7 data
        const layer7Timeseries = layer7Data.result.serie_0.timestamps.map((timestamp, index) => ({
          timestamp,
          value: parseInt(layer7Data.result.serie_0.values[index]),
        }));

        const layer7Total = layer7Timeseries.reduce((sum, point) => sum + point.value, 0);

        return {
          layer3: {
            timeseries: layer3Timeseries,
            total: layer3Total,
          },
          layer7: {
            timeseries: layer7Timeseries,
            total: layer7Total,
          },
          breakdown: {
            byProtocol: convertSummaryToArray(protocolData.result.summary_0 ?? {}),
            byVector: convertSummaryToArray(vectorData.result.summary_0 ?? {}),
          },
          lastUpdated: new Date().toISOString(),
        };
      },
      300 // Cache for 5 minutes
    );
  } catch (error) {
    console.error('Error collecting attack data:', error);
    return getEmptyAttackData();
  }
}

function getEmptyAttackData(): AttackData {
  return {
    layer3: {
      timeseries: [],
      total: 0,
    },
    layer7: {
      timeseries: [],
      total: 0,
    },
    breakdown: {
      byProtocol: [],
      byVector: [],
    },
    lastUpdated: new Date().toISOString(),
  };
}

/**
 * Check attack data and create events when threshold is exceeded
 */
export async function checkAndCreateAttackEvents(env: Env): Promise<void> {
  try {
    const attacks = await collectAttackData(env);

    // Calculate current hour totals
    const now = new Date();
    const currentHourStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours());
    const currentHourKey = currentHourStart.toISOString();

    // Filter timeseries to current hour
    const layer3CurrentHour = attacks.layer3.timeseries
      .filter((ts) => new Date(ts.timestamp) >= currentHourStart)
      .reduce((sum, ts) => sum + ts.value, 0);

    const layer7CurrentHour = attacks.layer7.timeseries
      .filter((ts) => new Date(ts.timestamp) >= currentHourStart)
      .reduce((sum, ts) => sum + ts.value, 0);

    // Check Layer 3 threshold
    if (layer3CurrentHour > RADAR_ATTACK_THRESHOLD) {
      const entityId = `radar-l3-${currentHourKey}`;

      // Check if we already created event for this hour
      const exists = await env.DB.prepare(`
        SELECT 1 FROM events WHERE source = 'radar' AND entity_id = ? LIMIT 1
      `).bind(entityId).first();

      if (!exists) {
        await createEvent(env, {
          source: 'radar',
          event_type: EVENT_TYPES.RADAR_L3_SPIKE,
          severity: 'warning',
          title: `DDoS Spike Detected: ${layer3CurrentHour} Layer 3 attacks`,
          description: formatAttackBreakdown(attacks.breakdown),
          entity_id: entityId,
          entity_name: 'Global Internet',
          occurred_at: currentHourStart.toISOString(),
        });

        console.log(`📢 Layer 3 DDoS spike: ${layer3CurrentHour} attacks`);
      }
    }

    // Check Layer 7 threshold
    if (layer7CurrentHour > RADAR_ATTACK_THRESHOLD) {
      const entityId = `radar-l7-${currentHourKey}`;

      // Check if we already created event for this hour
      const exists = await env.DB.prepare(`
        SELECT 1 FROM events WHERE source = 'radar' AND entity_id = ? LIMIT 1
      `).bind(entityId).first();

      if (!exists) {
        await createEvent(env, {
          source: 'radar',
          event_type: EVENT_TYPES.RADAR_L7_SPIKE,
          severity: 'warning',
          title: `DDoS Spike Detected: ${layer7CurrentHour} Layer 7 attacks`,
          description: formatAttackBreakdown(attacks.breakdown),
          entity_id: entityId,
          entity_name: 'Global Internet',
          occurred_at: currentHourStart.toISOString(),
        });

        console.log(`📢 Layer 7 DDoS spike: ${layer7CurrentHour} attacks`);
      }
    }
  } catch (error) {
    console.error('Error checking attack events:', error);
  }
}

/**
 * Format attack breakdown for event description
 */
function formatAttackBreakdown(breakdown: AttackData['breakdown']): string {
  const parts = [];

  if (breakdown.byProtocol.length > 0) {
    const top3Protocols = breakdown.byProtocol
      .sort((a, b) => b.value - a.value)
      .slice(0, 3)
      .map((p) => `${p.name}: ${p.value}`)
      .join(', ');
    parts.push(`Top protocols: ${top3Protocols}`);
  }

  if (breakdown.byVector.length > 0) {
    const top3Vectors = breakdown.byVector
      .sort((a, b) => b.value - a.value)
      .slice(0, 3)
      .map((v) => `${v.name}: ${v.value}`)
      .join(', ');
    parts.push(`Top vectors: ${top3Vectors}`);
  }

  return parts.length > 0 ? parts.join('. ') : 'DDoS attack activity detected';
}
