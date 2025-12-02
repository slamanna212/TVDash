import type { CloudIncident, ServiceStatus } from '../types';

// AWS Region Definitions
export const AWS_REGIONS = [
  { key: 'us-east-1', name: 'US East 1', location: 'N. Virginia' },
  { key: 'us-west-2', name: 'US West 2', location: 'Oregon' },
  { key: 'us-east-2', name: 'US East 2', location: 'Ohio' },
  { key: 'us-west-1', name: 'US West 1', location: 'California' },
  { key: 'eu-west-1', name: 'EU West 1', location: 'Ireland' },
];

// Azure Region Definitions
export const AZURE_REGIONS = [
  { key: 'eastus', name: 'East US', location: 'Virginia' },
  { key: 'westus', name: 'West US', location: 'California' },
  { key: 'centralus', name: 'Central US', location: 'Iowa' },
  { key: 'westeurope', name: 'West Europe', location: 'Netherlands' },
  { key: 'northeurope', name: 'North Europe', location: 'Ireland' },
];

// GCP Region Definitions
export const GCP_REGIONS = [
  { key: 'us-east1', name: 'us-east1', location: 'South Carolina' },
  { key: 'us-west1', name: 'us-west1', location: 'Oregon' },
  { key: 'us-central1', name: 'us-central1', location: 'Iowa' },
  { key: 'europe-west1', name: 'europe-west1', location: 'Belgium' },
  { key: 'asia-east1', name: 'asia-east1', location: 'Taiwan' },
];

/**
 * Extract AWS region from service name
 * Examples: "EC2 US-East-1" → "us-east-1", "Lambda US-East-1" → "us-east-1"
 */
export function extractAWSRegion(serviceName: string): string | null {
  const normalized = serviceName.toLowerCase().replace(/\s+/g, '-');

  // Try to match any of our target regions
  for (const region of AWS_REGIONS) {
    if (normalized.includes(region.key)) {
      return region.key;
    }
  }

  // Try alternative patterns like "us-east-1" or "useast1"
  const regionMatch = normalized.match(/(us|eu|ap)-(east|west|central|south|north)-?\d/);
  if (regionMatch) {
    return regionMatch[0].replace(/([a-z]+)([a-z]+)(\d)/, '$1-$2-$3');
  }

  return null;
}

/**
 * Normalize Azure region name to match our key format
 * Examples: "East US" → "eastus", "West Europe" → "westeurope"
 */
export function normalizeAzureRegion(regionName: string): string {
  return regionName.toLowerCase().replace(/\s+/g, '');
}

/**
 * Normalize GCP region name
 * Examples: "us-east1" → "us-east1" (usually already normalized)
 */
export function normalizeGCPRegion(regionName: string): string {
  return regionName.toLowerCase().trim();
}

/**
 * Check if an incident affects a specific region
 */
export function incidentAffectsRegion(incident: CloudIncident, regionKey: string, provider: string): boolean {
  // Check if incident has regions array
  if (incident.regions && incident.regions.length > 0) {
    // Normalize region names for comparison
    const normalizedRegions = incident.regions.map(r => {
      if (provider === 'AWS') {return r.toLowerCase().replace(/\s+/g, '-');}
      if (provider === 'Azure') {return normalizeAzureRegion(r);}
      if (provider === 'Google Cloud') {return normalizeGCPRegion(r);}
      return r.toLowerCase();
    });

    return normalizedRegions.some(r => r === regionKey || r.includes(regionKey) || regionKey.includes(r));
  }

  // For AWS, check if service name indicates the region
  if (provider === 'AWS' && incident.services && incident.services.length > 0) {
    for (const service of incident.services) {
      const extractedRegion = extractAWSRegion(service);
      if (extractedRegion === regionKey) {
        return true;
      }
    }
  }

  // Check incident title for region mentions
  const titleLower = incident.title.toLowerCase();
  const regionLower = regionKey.toLowerCase();

  if (titleLower.includes(regionLower)) {
    return true;
  }

  // For AWS, check for region patterns in title (e.g., "US-East-1")
  if (provider === 'AWS') {
    const extractedRegion = extractAWSRegion(incident.title);
    if (extractedRegion === regionKey) {
      return true;
    }
  }

  return false;
}

/**
 * Determine status for a specific region based on incidents affecting it
 */
export function determineRegionStatus(
  regionKey: string,
  provider: string,
  incidents: CloudIncident[]
): ServiceStatus {
  const affectedIncidents = incidents.filter(inc => incidentAffectsRegion(inc, regionKey, provider));

  if (affectedIncidents.length === 0) {
    return 'operational';
  }

  // Check for critical severity incidents
  const hasCritical = affectedIncidents.some(inc => inc.severity === 'critical');
  if (hasCritical) {
    return 'outage';
  }

  // Check for major severity incidents
  const hasMajor = affectedIncidents.some(inc => inc.severity === 'major');
  if (hasMajor) {
    return 'degraded';
  }

  // Any other incidents mean degraded
  return 'degraded';
}
