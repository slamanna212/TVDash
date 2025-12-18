import type { Env } from '../types';
import { withApiCache } from '../utils/api-cache';

export interface CisaKevResponse {
  vulnerabilities: Array<{
    cveId: string;
    vendorProject: string;
    product: string;
    vulnerabilityName: string;
    dateAdded: string;
    dueDate: string;
    shortDescription: string;
    knownRansomwareUse: string;
  }>;
  metadata: {
    catalogVersion: string;
    dateReleased: string;
    totalCount: number;
    lastChecked: string;
  } | null;
  lastUpdated: string;
}

export async function getCisaKevStatus(env: Env): Promise<Response> {
  try {
    const response = await withApiCache(
      env,
      'api:cisa-kev',
      60, // 60-second cache (data changes every 4 hours)
      async () => {
        // 1. Get latest 12 vulnerabilities by date_added
        const vulnsResult = await env.DB.prepare(`
          SELECT
            cve_id, vendor_project, product, vulnerability_name,
            date_added, due_date, short_description, known_ransomware_use
          FROM cisa_kev
          ORDER BY date_added DESC
          LIMIT 12
        `).all();

        // 2. Get latest catalog metadata
        const metadataRow = await env.DB.prepare(`
          SELECT catalog_version, date_released, total_count, checked_at
          FROM cisa_kev_metadata
          ORDER BY checked_at DESC
          LIMIT 1
        `).first<{
          catalog_version: string;
          date_released: string;
          total_count: number;
          checked_at: string;
        }>();

        return {
          vulnerabilities: (vulnsResult.results || []).map((v: any) => ({
            cveId: v.cve_id,
            vendorProject: v.vendor_project,
            product: v.product,
            vulnerabilityName: v.vulnerability_name,
            dateAdded: v.date_added,
            dueDate: v.due_date,
            shortDescription: v.short_description,
            knownRansomwareUse: v.known_ransomware_use,
          })),
          metadata: metadataRow ? {
            catalogVersion: metadataRow.catalog_version,
            dateReleased: metadataRow.date_released,
            totalCount: metadataRow.total_count,
            lastChecked: metadataRow.checked_at,
          } : null,
          lastUpdated: new Date().toISOString(),
        } as CisaKevResponse;
      }
    );

    return new Response(JSON.stringify(response), {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=60',
      },
    });
  } catch (error) {
    console.error('Error fetching CISA KEV data:', error);
    return new Response(JSON.stringify({
      error: 'Failed to fetch CISA KEV data',
      message: error instanceof Error ? error.message : 'Unknown error',
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
