import type { Env } from '../../types';

const BASE_URL = 'https://api-pro.ransomware.live';

export interface RansomwareStats {
  total_victims: number;
  total_groups: number;
  last_updated?: string;
}

export interface RansomwareVictim {
  id: string;
  victim: string;      // Victim name
  group: string;       // Group name
  discovered: string;  // ISO 8601 timestamp
  country?: string;    // Country code
  activity?: string;   // Sector/activity
}

export interface RansomwareSector {
  sector: string;      // Sector name
  count: number;
}

/**
 * Fetch global statistics
 */
export async function fetchRansomwareStats(env: Env): Promise<RansomwareStats | null> {
  try {
    const response = await fetch(`${BASE_URL}/stats`, {
      headers: {
        'X-API-KEY': env.RANSOMWARE_API_KEY,
        'User-Agent': 'MSP-Dashboard/1.0',
      },
    });

    if (!response.ok) {
      throw new Error(`API returned ${response.status}`);
    }

    const data = await response.json();
    return {
      total_victims: data.stats?.victims || 0,
      total_groups: data.stats?.groups || 0,
      last_updated: data.last_update || new Date().toISOString(),
    };
  } catch (error) {
    console.error('Error fetching ransomware stats:', error);
    return null;
  }
}

/**
 * Fetch recent victims (last 100)
 */
export async function fetchRecentVictims(env: Env): Promise<RansomwareVictim[]> {
  try {
    const response = await fetch(`${BASE_URL}/victims/recent`, {
      headers: {
        'X-API-KEY': env.RANSOMWARE_API_KEY,
        'User-Agent': 'MSP-Dashboard/1.0',
      },
    });

    if (!response.ok) {
      throw new Error(`API returned ${response.status}`);
    }

    const data = await response.json();
    return Array.isArray(data.victims) ? data.victims : [];
  } catch (error) {
    console.error('Error fetching recent victims:', error);
    return [];
  }
}

/**
 * Fetch sector statistics
 */
export async function fetchSectors(env: Env): Promise<RansomwareSector[]> {
  try {
    const response = await fetch(`${BASE_URL}/listsectors`, {
      headers: {
        'X-API-KEY': env.RANSOMWARE_API_KEY,
        'User-Agent': 'MSP-Dashboard/1.0',
      },
    });

    if (!response.ok) {
      throw new Error(`API returned ${response.status}`);
    }

    const data = await response.json();
    return Array.isArray(data.sectors) ? data.sectors : [];
  } catch (error) {
    console.error('Error fetching sectors:', error);
    return [];
  }
}
