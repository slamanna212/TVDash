import type { Env, GridStatus } from '../../types';
import { fetchWithCache } from '../../utils/cache';

const EIA_BASE_URL = 'https://api.eia.gov/v2';

export async function collectPJMGridStatus(env: Env): Promise<GridStatus> {
  if (!env.EIA_API_KEY) {
    console.warn('EIA_API_KEY not configured, returning unknown status');
    return getUnknownGridStatus();
  }

  try {
    return await fetchWithCache(
      env,
      'pjm-grid-status',
      'eia-grid',
      async () => {
        // Fetch demand data (latest hour)
        const demandData = await fetchPJMDemand(env.EIA_API_KEY);

        // Fetch fuel mix data (latest hour)
        const fuelMix = await fetchPJMFuelMix(env.EIA_API_KEY);

        // Determine status (operational if data retrieved successfully)
        const status: 'operational' | 'degraded' | 'outage' | 'unknown' =
          demandData ? 'operational' : 'unknown';

        return {
          region: 'PJM',
          status,
          demand_mw: demandData?.demand,
          fuel_mix: fuelMix,
          alerts: [], // EIA doesn't provide alerts - empty array
          checked_at: new Date().toISOString(),
        };
      },
      300 // 5-minute cache
    );
  } catch (error) {
    console.error('Error collecting PJM grid status:', error);
    return getUnknownGridStatus();
  }
}

async function fetchPJMDemand(apiKey: string): Promise<{ demand: number } | null> {
  try {
    const url = `${EIA_BASE_URL}/electricity/rto/region-data/data/`;
    const params = new URLSearchParams({
      'api_key': apiKey,
      'frequency': 'local-hourly',
      'data[0]': 'value',
      'facets[respondent][]': 'PJM',
      'facets[type][]': 'D', // Demand
      'sort[0][column]': 'period',
      'sort[0][direction]': 'desc',
      'length': '1'
    });

    const response = await fetch(`${url}?${params}`);
    if (!response.ok) {
      throw new Error(`EIA API returned ${response.status}`);
    }

    const data = await response.json();
    if (data.response?.data?.[0]?.value) {
      return {
        demand: parseInt(data.response.data[0].value, 10)
      };
    }
    return null;
  } catch (error) {
    console.error('Error fetching PJM demand:', error);
    return null;
  }
}

async function fetchPJMFuelMix(apiKey: string): Promise<Record<string, number>> {
  try {
    const url = `${EIA_BASE_URL}/electricity/rto/fuel-type-data/data/`;
    const params = new URLSearchParams({
      'api_key': apiKey,
      'frequency': 'local-hourly',
      'data[0]': 'value',
      'facets[respondent][]': 'PJM',
      'sort[0][column]': 'period',
      'sort[0][direction]': 'desc',
      'length': '100' // Get multiple to capture all fuel types for latest hour
    });

    const response = await fetch(`${url}?${params}`);
    if (!response.ok) {
      throw new Error(`EIA API returned ${response.status}`);
    }

    const data = await response.json();
    const fuelData: Record<string, number> = {};

    // Get latest period's data
    const latestPeriod = data.response?.data?.[0]?.period;
    if (!latestPeriod) return {};

    // Aggregate fuel types for the latest hour
    let totalGeneration = 0;
    const fuelTotals: Record<string, number> = {};

    for (const item of data.response.data) {
      if (item.period === latestPeriod && item.value) {
        const value = parseInt(item.value, 10);
        fuelTotals[item.fueltype] = value;
        totalGeneration += value;
      }
    }

    // Convert to percentages
    for (const [fuel, value] of Object.entries(fuelTotals)) {
      fuelData[fuel] = Math.round((value / totalGeneration) * 100);
    }

    return fuelData;
  } catch (error) {
    console.error('Error fetching PJM fuel mix:', error);
    return {};
  }
}

function getUnknownGridStatus(): GridStatus {
  return {
    region: 'PJM',
    status: 'unknown',
    alerts: [],
    checked_at: new Date().toISOString(),
  };
}
