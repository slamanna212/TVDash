import type { Env } from '../types';
import { fetchWithCache } from '../utils/cache';
import { fetchCvssScoresBatch } from './nvd-api';

const KEV_FEED_URL = 'https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json';

export interface CisaKevFeed {
  title: string;
  catalogVersion: string;
  dateReleased: string;
  count: number;
  vulnerabilities: CisaKevEntry[];
}

export interface CisaKevEntry {
  cveID: string;
  vendorProject: string;
  product: string;
  vulnerabilityName: string;
  dateAdded: string;            // YYYY-MM-DD format
  shortDescription: string;
  requiredAction: string;
  dueDate: string;              // YYYY-MM-DD format
  knownRansomwareCampaignUse: string;  // "Known" | "Unknown"
  notes: string;
}

/**
 * Fetch CISA KEV catalog with caching
 * TTL: 4 hours (14400 seconds)
 */
async function fetchKevCatalog(env: Env): Promise<CisaKevFeed | null> {
  try {
    return await fetchWithCache<CisaKevFeed>(
      env,
      'cisa-kev:feed',
      'cisa-kev',
      async () => {
        const response = await fetch(KEV_FEED_URL, {
          headers: {
            'User-Agent': 'MSP-Dashboard/1.0',
          },
        });

        if (!response.ok) {
          throw new Error(`CISA KEV API returned ${response.status}`);
        }

        return await response.json() as CisaKevFeed;
      },
      14400 // 4 hours
    );
  } catch (error) {
    console.error('Error fetching CISA KEV catalog:', error);
    return null;
  }
}

/**
 * Main collector function - runs every 4 hours
 * Updates database with latest KEV entries
 */
export async function collectCisaKevData(env: Env): Promise<void> {
  const now = new Date().toISOString();

  try {
    const feed = await fetchKevCatalog(env);
    if (!feed) {
      console.error('Failed to fetch KEV catalog');
      return;
    }

    // 1. Store catalog metadata
    await env.DB.prepare(`
      INSERT INTO cisa_kev_metadata (catalog_version, date_released, total_count, checked_at)
      VALUES (?, ?, ?, ?)
    `).bind(
      feed.catalogVersion,
      feed.dateReleased,
      feed.count,
      now
    ).run();

    // 2. Insert/update vulnerabilities in parallel
    const insertPromises = feed.vulnerabilities.map(async (vuln) => {
      return env.DB.prepare(`
        INSERT INTO cisa_kev (
          cve_id, vendor_project, product, vulnerability_name,
          date_added, due_date, short_description, required_action,
          known_ransomware_use, notes, last_seen
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(cve_id) DO UPDATE SET
          vendor_project = excluded.vendor_project,
          product = excluded.product,
          vulnerability_name = excluded.vulnerability_name,
          date_added = excluded.date_added,
          due_date = excluded.due_date,
          short_description = excluded.short_description,
          required_action = excluded.required_action,
          known_ransomware_use = excluded.known_ransomware_use,
          notes = excluded.notes,
          last_seen = excluded.last_seen
      `).bind(
        vuln.cveID,
        vuln.vendorProject,
        vuln.product,
        vuln.vulnerabilityName,
        vuln.dateAdded,
        vuln.dueDate,
        vuln.shortDescription,
        vuln.requiredAction,
        vuln.knownRansomwareCampaignUse,
        vuln.notes,
        now
      ).run();
    });

    await Promise.all(insertPromises);
    console.log(`✓ CISA KEV: Processed ${feed.vulnerabilities.length} vulnerabilities (catalog v${feed.catalogVersion})`);

    // 3. Fetch CVSS scores for CVEs without scores
    // Only fetch for CVEs that:
    // - Don't have a score yet (cvss_score IS NULL)
    // - Haven't been checked recently (cvss_fetched_at IS NULL or older than 7 days)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    const cvesNeedingScores = await env.DB.prepare(`
      SELECT cve_id FROM cisa_kev
      WHERE cvss_score IS NULL
        AND (cvss_fetched_at IS NULL OR cvss_fetched_at < ?)
      LIMIT 100
    `).bind(sevenDaysAgo).all();

    if (cvesNeedingScores.results && cvesNeedingScores.results.length > 0) {
      const cveIds = cvesNeedingScores.results.map((row: any) => row.cve_id);
      console.log(`Fetching CVSS scores for ${cveIds.length} CVEs...`);

      const cvssScores = await fetchCvssScoresBatch(cveIds, env);

      // Update database with scores
      const updatePromises = Array.from(cvssScores.entries()).map(async ([cveId, cvssData]) => {
        return env.DB.prepare(`
          UPDATE cisa_kev
          SET cvss_score = ?,
              cvss_version = ?,
              cvss_severity = ?,
              cvss_vector = ?,
              cvss_fetched_at = ?
          WHERE cve_id = ?
        `).bind(
          cvssData.score,
          cvssData.version,
          cvssData.severity,
          cvssData.vectorString,
          now,
          cveId
        ).run();
      });

      await Promise.all(updatePromises);
      console.log(`✓ CVSS scores updated for ${cvssScores.size} CVEs`);
    } else {
      console.log('No CVEs need CVSS score updates');
    }

  } catch (error) {
    console.error('Error collecting CISA KEV data:', error);
  }
}
