/**
 * Event generation configuration
 */

// How long must a service be degraded before we log it?
export const DEGRADED_THRESHOLD_MINUTES = 5;

// Radar attack threshold (events created above this number)
export const RADAR_ATTACK_THRESHOLD = 1000;

// Maximum events to fetch per API call
export const MAX_EVENTS_PER_REQUEST = 100;

// Default event expiration (days)
export const EVENT_EXPIRATION_DAYS = 30;

// Event type definitions
export const EVENT_TYPES = {
  // Services
  SERVICE_OUTAGE: 'outage',
  SERVICE_DEGRADED: 'degraded',
  SERVICE_RESOLVED: 'resolved',

  // Cloud
  CLOUD_INCIDENT_STARTED: 'incident_started',
  CLOUD_INCIDENT_RESOLVED: 'incident_resolved',

  // M365 / Workspace
  M365_ISSUE: 'service_issue',
  M365_RESOLVED: 'issue_resolved',

  // ISP
  ISP_DEGRADED: 'connectivity_degraded',
  ISP_OUTAGE: 'connectivity_outage',
  ISP_BGP: 'bgp_incident',
  ISP_RESOLVED: 'resolved',

  // Radar
  RADAR_L3_SPIKE: 'ddos_spike_layer3',
  RADAR_L7_SPIKE: 'ddos_spike_layer7',
} as const;

// Source labels for UI
export const SOURCE_LABELS: Record<string, string> = {
  service: 'Services',
  cloud: 'Cloud',
  m365: 'Microsoft 365',
  gworkspace: 'Google Workspace',
  isp: 'ISP',
  radar: 'Security',
};
