import type { Env, CloudRegion } from '../types';
import { collectAWSStatus } from '../collectors/cloud/aws';
import { collectAzureStatus } from '../collectors/cloud/azure';
import { collectGCPStatus } from '../collectors/cloud/gcp';
import {
  AWS_REGIONS,
  AZURE_REGIONS,
  GCP_REGIONS,
  determineRegionStatus,
  incidentAffectsRegion,
} from '../utils/cloud-regions';

export async function getCloudStatus(env: Env): Promise<Response> {
  try {
    // Fetch status from all three cloud providers in parallel
    const [aws, azure, gcp] = await Promise.all([
      collectAWSStatus(env),
      collectAzureStatus(env),
      collectGCPStatus(env),
    ]);

    // Map incidents to regions for each provider
    aws.regions = AWS_REGIONS.map((region): CloudRegion => {
      const affectedIncidents = aws.incidents.filter(inc =>
        incidentAffectsRegion(inc, region.key, 'AWS')
      );
      return {
        ...region,
        provider: 'AWS',
        status: determineRegionStatus(region.key, 'AWS', aws.incidents),
        affectedIncidents,
        lastUpdated: aws.lastUpdated,
      };
    });

    azure.regions = AZURE_REGIONS.map((region): CloudRegion => {
      const affectedIncidents = azure.incidents.filter(inc =>
        incidentAffectsRegion(inc, region.key, 'Azure')
      );
      return {
        ...region,
        provider: 'Azure',
        status: determineRegionStatus(region.key, 'Azure', azure.incidents),
        affectedIncidents,
        lastUpdated: azure.lastUpdated,
      };
    });

    gcp.regions = GCP_REGIONS.map((region): CloudRegion => {
      const affectedIncidents = gcp.incidents.filter(inc =>
        incidentAffectsRegion(inc, region.key, 'Google Cloud')
      );
      return {
        ...region,
        provider: 'Google Cloud',
        status: determineRegionStatus(region.key, 'Google Cloud', gcp.incidents),
        affectedIncidents,
        lastUpdated: gcp.lastUpdated,
      };
    });

    return new Response(JSON.stringify({
      providers: [aws, azure, gcp],
      lastUpdated: new Date().toISOString(),
    }), {
      headers: { 'Content-Type': 'application/json' },
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
