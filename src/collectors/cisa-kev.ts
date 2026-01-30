import type { Env } from '../types';
import { fetchWithCache } from '../utils/cache';
import { fetchCvssScoresBatch } from './nvd-api';
import { createEvent, getAlertState, updateAlertState } from '../db/queries';
import { EVENT_TYPES } from '../config/events';

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

    // 2. Only process the 12 most recent CVEs (shown on dashboard)
    const recentVulns = feed.vulnerabilities
      .sort((a, b) => b.dateAdded.localeCompare(a.dateAdded))
      .slice(0, 12);

    console.log(`Processing ${recentVulns.length} recent CVEs from catalog of ${feed.count}`);

    // 3. Insert/update vulnerabilities in parallel
    const insertPromises = recentVulns.map(async (vuln) => {
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
    console.log(`✓ CISA KEV: Processed ${recentVulns.length} vulnerabilities (catalog v${feed.catalogVersion})`);

    // 4. Fetch CVSS scores for CVEs without scores
    // Only fetch for CVEs that:
    // - Don't have a score yet (cvss_score IS NULL)
    // - Haven't been checked recently (cvss_fetched_at IS NULL or older than 7 days)
    // Prioritize latest CVEs first (shown on dashboard)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    const cvesNeedingScores = await env.DB.prepare(`
      SELECT cve_id FROM cisa_kev
      WHERE cvss_score IS NULL
        AND (cvss_fetched_at IS NULL OR cvss_fetched_at < ?)
      ORDER BY date_added DESC
      LIMIT 12
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

    // 5. Create events for new CVEs and approaching due dates
    await createCisaEvents(env, recentVulns, now);

  } catch (error) {
    console.error('Error collecting CISA KEV data:', error);
  }
}

/**
 * Create events for CISA KEV vulnerabilities:
 * - New CVEs added to the catalog
 * - CVEs with due dates approaching (7 days, 1 day)
 */
async function createCisaEvents(
  env: Env,
  vulnerabilities: CisaKevEntry[],
  now: string
): Promise<void> {
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);

  for (const vuln of vulnerabilities) {
    try {
      // Check if we've already seen this CVE
      const alertState = await getAlertState(env, 'cisa-cve', vuln.cveID);

      // Create event for NEW CVEs (not seen before)
      if (!alertState) {
        await createEvent(env, {
          source: 'cisa',
          event_type: EVENT_TYPES.CISA_NEW_CVE,
          severity: vuln.knownRansomwareCampaignUse === 'Known' ? 'critical' : 'warning',
          title: `New KEV: ${vuln.cveID} - ${vuln.vendorProject} ${vuln.product}`,
          description: vuln.shortDescription,
          entity_id: vuln.cveID,
          entity_name: vuln.vulnerabilityName,
          occurred_at: `${vuln.dateAdded}T00:00:00Z`,
        });

        // Mark as seen with status 'new'
        await updateAlertState(env, 'cisa-cve', vuln.cveID, 'new');
        console.log(`Created event for new CVE: ${vuln.cveID}`);
      }

      // Check for approaching due dates
      const dueDate = new Date(vuln.dueDate);
      dueDate.setHours(0, 0, 0, 0);
      const daysUntilDue = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

      // Get current alert status
      const currentStatus = alertState?.last_status || 'new';

      // Create warning event 7 days before due date
      if (daysUntilDue <= 7 && daysUntilDue > 1 && currentStatus !== 'due_7day' && currentStatus !== 'due_1day') {
        await createEvent(env, {
          source: 'cisa',
          event_type: EVENT_TYPES.CISA_DUE_SOON,
          severity: 'warning',
          title: `KEV Due Soon: ${vuln.cveID} - ${daysUntilDue} days remaining`,
          description: `${vuln.vendorProject} ${vuln.product}: ${vuln.requiredAction}. Due: ${vuln.dueDate}`,
          entity_id: vuln.cveID,
          entity_name: vuln.vulnerabilityName,
          occurred_at: now,
        });

        await updateAlertState(env, 'cisa-cve', vuln.cveID, 'due_7day');
        console.log(`Created 7-day warning for CVE: ${vuln.cveID}`);
      }

      // Create critical event 1 day before due date
      if (daysUntilDue <= 1 && daysUntilDue >= 0 && currentStatus !== 'due_1day') {
        await createEvent(env, {
          source: 'cisa',
          event_type: EVENT_TYPES.CISA_DUE_SOON,
          severity: 'critical',
          title: `KEV Due Tomorrow: ${vuln.cveID} - ${vuln.vendorProject} ${vuln.product}`,
          description: `URGENT: ${vuln.requiredAction}. Due: ${vuln.dueDate}`,
          entity_id: vuln.cveID,
          entity_name: vuln.vulnerabilityName,
          occurred_at: now,
        });

        await updateAlertState(env, 'cisa-cve', vuln.cveID, 'due_1day');
        console.log(`Created 1-day critical warning for CVE: ${vuln.cveID}`);
      }
    } catch (error) {
      console.error(`Error creating event for CVE ${vuln.cveID}:`, error);
    }
  }
}
