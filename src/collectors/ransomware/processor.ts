import type { Env } from '../../types';
import { fetchRansomwareStats, fetchRecentVictims, fetchSectors } from './api';

/**
 * Main collector function - runs every 5 minutes
 */
export async function collectRansomwareData(env: Env): Promise<void> {
  const now = new Date().toISOString();

  try {
    // 1. Collect and store stats
    const stats = await fetchRansomwareStats(env);
    if (stats) {
      await env.DB.prepare(`
        INSERT INTO ransomware_stats (total_victims, total_groups, checked_at)
        VALUES (?, ?, ?)
      `).bind(stats.total_victims, stats.total_groups, now).run();
    }

    // 2. Collect and store recent victims
    const victims = await fetchRecentVictims(env);
    const victimPromises = victims.map(async (victim) => {
      // Extract country code (may need parsing from victim.country)
      const countryCode = extractCountryCode(victim.country);

      return env.DB.prepare(`
        INSERT INTO ransomware_victims
        (victim_id, victim_name, group_name, country_code, sector, discovered_date, last_seen)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(victim_id) DO UPDATE SET
          last_seen = excluded.last_seen
      `).bind(
        victim.id,
        victim.victim,
        victim.group,
        countryCode,
        victim.activity || 'Unknown',
        victim.discovered,
        now
      ).run();
    });

    // Wait for all victim inserts to complete
    await Promise.all(victimPromises);
    console.log(`✓ Inserted ${victims.length} victims into database`);

    // 3. Update daily counts (aggregate victims by date)
    await updateDailyCounts(env);

    // 4. Collect and store sector data
    const sectors = await fetchSectors(env);
    const sectorPromises = sectors.map(async (sector) => {
      return env.DB.prepare(`
        INSERT INTO ransomware_sectors (sector_name, victim_count, checked_at)
        VALUES (?, ?, ?)
      `).bind(sector.sector, sector.count, now).run();
    });

    // Wait for all sector inserts to complete
    await Promise.all(sectorPromises);

    console.log(`✓ Ransomware data collected: ${victims.length} victims, ${sectors.length} sectors`);
  } catch (error) {
    console.error('Error collecting ransomware data:', error);
  }
}

/**
 * Aggregate victims by date for line chart
 */
async function updateDailyCounts(env: Env): Promise<void> {
  try {
    // Get victims from last 180 days, grouped by date
    const result = await env.DB.prepare(`
      SELECT
        DATE(discovered_date) as date,
        COUNT(*) as count
      FROM ransomware_victims
      WHERE discovered_date >= date('now', '-180 days')
      GROUP BY DATE(discovered_date)
      ORDER BY date DESC
    `).all();

    if (!result.success || !result.results) {
      console.log('⚠ No daily count data to update');
      return;
    }

    // Update or insert daily counts
    const updatePromises = result.results.map(async (row) => {
      const dailyRow = row as { date: string; count: number };
      return env.DB.prepare(`
        INSERT INTO ransomware_daily_counts (date, victim_count, updated_at)
        VALUES (?, ?, ?)
        ON CONFLICT(date) DO UPDATE SET
          victim_count = excluded.victim_count,
          updated_at = excluded.updated_at
      `).bind(dailyRow.date, dailyRow.count, new Date().toISOString()).run();
    });

    await Promise.all(updatePromises);
    console.log(`✓ Updated ${result.results.length} daily count records`);
  } catch (error) {
    console.error('Error updating daily counts:', error);
  }
}

/**
 * Parse country code from various formats
 * Ransomware.live API may return country names or codes
 */
function extractCountryCode(country: string | undefined): string | null {
  if (!country) {
    return null;
  }

  // If already 2-letter code
  if (country.length === 2) {
    return country.toUpperCase();
  }

  // Basic country name to code mapping (extend as needed)
  const countryMap: Record<string, string> = {
    'United States': 'US',
    'United Kingdom': 'GB',
    'Germany': 'DE',
    'France': 'FR',
    'Canada': 'CA',
    'Australia': 'AU',
    'Italy': 'IT',
    'Spain': 'ES',
    'Netherlands': 'NL',
    'Sweden': 'SE',
    'Brazil': 'BR',
    'Mexico': 'MX',
    'India': 'IN',
    'Japan': 'JP',
    'China': 'CN',
    'South Korea': 'KR',
    'Singapore': 'SG',
    'Switzerland': 'CH',
    'Belgium': 'BE',
    'Poland': 'PL',
    // Add more as discovered from API
  };

  return countryMap[country] || null;
}
