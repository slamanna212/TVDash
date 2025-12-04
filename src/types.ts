export interface Env {
  DB: D1Database;
  ASSETS: Fetcher;
  CF_RADAR_API_TOKEN: string;
  TEAMS_WEBHOOK_URL?: string;
  M365_TENANT_ID?: string;
  M365_CLIENT_ID?: string;
  M365_CLIENT_SECRET?: string;
  HEALTH_RELAY_SECRET: string;
  ENVIRONMENT: string;
  ALERTS_ENABLED: string;
  PAGE_ROTATION_SECONDS: string;
  TICKER_REFRESH_SECONDS: string;
  RANSOMWARE_API_KEY: string;
}

export type ServiceStatus = 'operational' | 'degraded' | 'outage' | 'unknown';
export type EventSeverity = 'info' | 'warning' | 'critical';
export type ServiceCategory = 'msp_tool' | 'cloud' | 'productivity' | 'isp';
export type CheckType = 'http' | 'statuspage' | 'api' | 'rss';

export interface Service {
  id: number;
  name: string;
  category: ServiceCategory;
  check_type: CheckType;
  check_url?: string;
  statuspage_id?: string;
  component_groups?: string;  // JSON array: ["Group Name 1", "Group Name 2"]
  supports_warning: number;
  display_order: number;
  created_at: string;
}

export interface ServiceWithStatus extends Service {
  status: ServiceStatus;
  statusText?: string;
  responseTime?: number;
  lastChecked: string;
  isMaintenance?: boolean;
}

export interface StatusHistory {
  id: number;
  service_id: number;
  status: ServiceStatus;
  response_time_ms?: number;
  message?: string;
  checked_at: string;
  is_maintenance?: number;
}

export interface LocalISP {
  id: number;
  name: string;
  primary_asn: number;
  secondary_asns?: string; // JSON array
  display_order: number;
}

export interface CloudRegion {
  key: string;           // "us-east-1", "eastus", "us-east1"
  name: string;          // "US East 1"
  location: string;      // "N. Virginia"
  provider: string;      // "AWS", "Azure", "Google Cloud"
  status: ServiceStatus;
  affectedIncidents: CloudIncident[];
  lastUpdated: string;
}

export interface CloudProvider {
  name: string;
  status: ServiceStatus;
  regions: CloudRegion[];  // NEW: Array of region statuses
  incidents: CloudIncident[];
  lastUpdated: string;
}

export interface CloudIncident {
  title: string;
  severity: string;
  regions?: string[];
  services?: string[];
  startTime: string;
  message?: string;
}

export interface M365Service {
  name: string;
  status: ServiceStatus;
  issues: M365Issue[];
}

export interface M365Issue {
  id: string;
  title: string;
  severity: string;
  startTime: string;
  lastUpdate: string;
}

export interface Event {
  id?: number;
  source: string;
  event_type: string;
  severity: EventSeverity;
  title: string;
  description?: string;
  entity_id?: string;
  entity_name?: string;
  occurred_at: string;
  resolved_at?: string;
  expires_at?: string;
  created_at?: string;
}

export interface ApiCache {
  cache_key: string;
  source: string;
  data: string;
  fetched_at: string;
  expires_at: string;
}

export interface CheckResult {
  status: ServiceStatus;
  responseTime?: number;
  message?: string;
  isMaintenance?: boolean;
}
