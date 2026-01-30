import type { Env, CloudRegion, CloudProvider, CloudIncident } from '../types';
import {
  AWS_REGIONS,
  AZURE_REGIONS,
  GCP_REGIONS,
  determineRegionStatus,
  incidentAffectsRegion,
} from '../utils/cloud-regions';
import { withApiCache } from '../utils/api-cache';

export async function getCloudStatus(env: Env): Promise<Response> {
  try {
    const data = await withApiCache(
      env,
      'api:cloud',
      30, // 30 second cache
      async () => {
        // Read from cloud_status table instead of making external API calls
        const latestStatuses = await env.DB.prepare(`
      SELECT provider, overall_status, incidents, last_updated, checked_at
      FROM cloud_status
      WHERE checked_at IN (
        SELECT MAX(checked_at) FROM cloud_status GROUP BY provider
      )
      ORDER BY provider
    `).all();

    if (!latestStatuses.success || !latestStatuses.results) {
      throw new Error('Failed to fetch cloud status from database');
    }

    // Parse database results into CloudProvider objects
    const providers: CloudProvider[] = latestStatuses.results.map((row: any) => {
      let incidents: CloudIncident[] = [];
      try {
        incidents = JSON.parse(row.incidents || '[]');
      } catch (e) {
        console.error(`Error parsing incidents for ${row.provider}:`, e);
      }

      // Determine provider name (capitalize properly, case-insensitive comparison)
      const providerLower = row.provider.toLowerCase();
      let providerName = row.provider.toUpperCase();
      if (providerLower === 'gcp') {providerName = 'Google Cloud';}
      else if (providerLower === 'azure') {providerName = 'Azure';}
      else if (providerLower === 'aws') {providerName = 'AWS';}

      return {
        name: providerName,
        status: row.overall_status,
        incidents,
        regions: [], // Will be populated below
        lastUpdated: row.last_updated || row.checked_at,
      };
    });

    // Map incidents to regions for each provider
    providers.forEach(provider => {
      let regionList: typeof AWS_REGIONS = [];

      if (provider.name === 'AWS') {
        regionList = AWS_REGIONS;
      } else if (provider.name === 'Azure') {
        regionList = AZURE_REGIONS;
      } else if (provider.name === 'Google Cloud') {
        regionList = GCP_REGIONS;
      }

      provider.regions = regionList.map((region): CloudRegion => {
        const affectedIncidents = provider.incidents.filter(inc =>
          incidentAffectsRegion(inc, region.key, provider.name)
        );
        return {
          ...region,
          provider: provider.name,
          status: determineRegionStatus(region.key, provider.name, provider.incidents),
          affectedIncidents,
          lastUpdated: provider.lastUpdated,
        };
      });
    });

        return {
          providers,
          lastUpdated: new Date().toISOString(),
        };
      }
    );

    return new Response(JSON.stringify(data), {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=30',
      },
    });
  } catch (error) {
    console.error('Error fetching cloud status:', error);
    return new Response(JSON.stringify({
      error: 'Failed to fetch cloud status',
      message: error instanceof Error ? error.message : 'Unknown error',
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
