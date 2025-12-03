import type { Env } from '../types';
import { withApiCache } from '../utils/api-cache';

export interface RansomwareResponse {
  stats: {
    totalVictims: number;
    totalGroups: number;
    lastUpdated: string;
  };
  recentVictims: Array<{
    id: string;
    name: string;
    group: string;
    countryCode: string | null;
    sector: string;
    discoveredDate: string;
  }>;
  dailyCounts: Array<{
    date: string;
    count: number;
  }>;
  topSectors: Array<{
    name: string;
    count: number;
  }>;
  lastUpdated: string;
}

export async function getRansomwareStatus(env: Env): Promise<Response> {
  try {
    const response = await withApiCache(
      env,
      'api:ransomware',
      60, // 60 second cache (less frequently updated data)
      async () => {
        // 1. Get latest stats
        const statsRow = await env.DB.prepare(`
      SELECT total_victims, total_groups, checked_at
      FROM ransomware_stats
      ORDER BY checked_at DESC
      LIMIT 1
    `).first<{ total_victims: number; total_groups: number; checked_at: string }>();

    // 2. Get recent victims (last 20 for cards display)
    const victimsResult = await env.DB.prepare(`
      SELECT victim_id, victim_name, group_name, country_code, sector, discovered_date
      FROM ransomware_victims
      ORDER BY discovered_date DESC
      LIMIT 20
    `).all();

    // 3. Get daily counts (last 30 days)
    const dailyResult = await env.DB.prepare(`
      SELECT date, victim_count
      FROM ransomware_daily_counts
      WHERE date >= date('now', '-30 days')
      ORDER BY date ASC
    `).all();

    // 4. Get top 8 sectors (most recent snapshot)
    const sectorsResult = await env.DB.prepare(`
      SELECT sector_name, victim_count
      FROM ransomware_sectors
      WHERE checked_at = (SELECT MAX(checked_at) FROM ransomware_sectors)
      ORDER BY victim_count DESC
      LIMIT 8
    `).all();

        return {
          stats: {
            totalVictims: statsRow?.total_victims || 0,
            totalGroups: statsRow?.total_groups || 0,
            lastUpdated: statsRow?.checked_at || new Date().toISOString(),
          },
          recentVictims: (victimsResult.results || []).map((v: any) => ({
            id: v.victim_id,
            name: v.victim_name,
            group: v.group_name,
            countryCode: v.country_code,
            sector: v.sector,
            discoveredDate: v.discovered_date,
          })),
          dailyCounts: (dailyResult.results || []).map((d: any) => ({
            date: d.date,
            count: d.victim_count,
          })),
          topSectors: (sectorsResult.results || []).map((s: any) => ({
            name: s.sector_name,
            count: s.victim_count,
          })),
          lastUpdated: new Date().toISOString(),
        } as RansomwareResponse;
      }
    );

    return new Response(JSON.stringify(response), {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=60',
      },
    });
  } catch (error) {
    console.error('Error fetching ransomware status:', error);
    return new Response(JSON.stringify({
      error: 'Failed to fetch ransomware data',
      message: error instanceof Error ? error.message : 'Unknown error',
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
