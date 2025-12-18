/**
 * NVD API 2.0 Collector - Fetch CVSS scores for CVEs
 *
 * Fetches CVSS scores from the National Vulnerability Database (NVD) API 2.0
 * Docs: https://nvd.nist.gov/developers/vulnerabilities
 *
 * Rate Limits:
 * - Without API key: 50 requests / 30 seconds
 * - With API key: 500 requests / 30 seconds
 */

import type { Env } from '../types';

const NVD_API_BASE = 'https://services.nvd.nist.gov/rest/json/cves/2.0';
const REQUEST_DELAY_MS_NO_KEY = 1200; // 1200ms = 50 requests/minute (without API key: 50/30s limit)
const REQUEST_DELAY_MS_WITH_KEY = 120; // 120ms = 500 requests/minute (with API key: 500/30s limit)

export interface NvdCvssData {
  score: number | null;           // 0.0-10.0
  version: string | null;         // "3.1", "3.0", or "2.0"
  severity: string | null;        // "LOW", "MEDIUM", "HIGH", "CRITICAL"
  vectorString: string | null;    // CVSS vector
}

/**
 * Fetch CVSS score for a single CVE from NVD API 2.0
 */
export async function fetchCvssScore(
  cveId: string,
  env: Env
): Promise<NvdCvssData> {
  try {
    // Build request URL
    const url = `${NVD_API_BASE}?cveId=${encodeURIComponent(cveId)}`;

    // Prepare headers (API key optional)
    const headers: Record<string, string> = {
      'User-Agent': 'MSP-Dashboard/1.0',
      'Accept': 'application/json',
    };

    // Add API key if configured (increases rate limit to 500/30s)
    if (env.NVD_API_KEY) {
      headers['apiKey'] = env.NVD_API_KEY;
    }

    const response = await fetch(url, { headers });

    if (!response.ok) {
      console.error(`NVD API error for ${cveId}: ${response.status}`);
      return { score: null, version: null, severity: null, vectorString: null };
    }

    const data = await response.json();

    // Parse response (NVD API 2.0 structure)
    if (!data.vulnerabilities || data.vulnerabilities.length === 0) {
      console.warn(`No NVD data found for ${cveId}`);
      return { score: null, version: null, severity: null, vectorString: null };
    }

    const vuln = data.vulnerabilities[0].cve;

    // Prefer CVSS v3.1, fall back to v3.0, then v2.0
    let cvssData: NvdCvssData = { score: null, version: null, severity: null, vectorString: null };

    // Try CVSS v3.1 (preferred)
    if (vuln.metrics?.cvssMetricV31 && vuln.metrics.cvssMetricV31.length > 0) {
      const metric = vuln.metrics.cvssMetricV31[0];
      cvssData = {
        score: metric.cvssData.baseScore,
        version: '3.1',
        severity: metric.cvssData.baseSeverity,
        vectorString: metric.cvssData.vectorString,
      };
    }
    // Fall back to CVSS v3.0
    else if (vuln.metrics?.cvssMetricV30 && vuln.metrics.cvssMetricV30.length > 0) {
      const metric = vuln.metrics.cvssMetricV30[0];
      cvssData = {
        score: metric.cvssData.baseScore,
        version: '3.0',
        severity: metric.cvssData.baseSeverity,
        vectorString: metric.cvssData.vectorString,
      };
    }
    // Fall back to CVSS v2.0
    else if (vuln.metrics?.cvssMetricV2 && vuln.metrics.cvssMetricV2.length > 0) {
      const metric = vuln.metrics.cvssMetricV2[0];
      cvssData = {
        score: metric.cvssData.baseScore,
        version: '2.0',
        severity: metric.baseSeverity || null, // v2 uses different severity mapping
        vectorString: metric.cvssData.vectorString,
      };
    }

    return cvssData;
  } catch (error) {
    console.error(`Error fetching CVSS for ${cveId}:`, error);
    return { score: null, version: null, severity: null, vectorString: null };
  }
}

/**
 * Fetch CVSS scores for multiple CVEs with rate limiting
 * Processes sequentially with delay to respect API limits
 */
export async function fetchCvssScoresBatch(
  cveIds: string[],
  env: Env
): Promise<Map<string, NvdCvssData>> {
  const results = new Map<string, NvdCvssData>();

  // Use faster delay if API key is configured
  const delay = env.NVD_API_KEY ? REQUEST_DELAY_MS_WITH_KEY : REQUEST_DELAY_MS_NO_KEY;
  const rateLimit = env.NVD_API_KEY ? '500/30s' : '50/30s';

  console.log(`Fetching CVSS scores for ${cveIds.length} CVEs (rate limit: ${rateLimit})...`);

  for (let i = 0; i < cveIds.length; i++) {
    const cveId = cveIds[i];

    // Fetch score
    const cvssData = await fetchCvssScore(cveId, env);
    results.set(cveId, cvssData);

    // Log progress
    if ((i + 1) % 10 === 0 || i === cveIds.length - 1) {
      console.log(`  Progress: ${i + 1}/${cveIds.length} CVEs processed`);
    }

    // Rate limiting: Wait before next request (except on last iteration)
    if (i < cveIds.length - 1) {
      await sleep(delay);
    }
  }

  console.log(`✓ CVSS fetch complete: ${results.size} CVEs processed`);
  return results;
}

/**
 * Sleep utility for rate limiting
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
