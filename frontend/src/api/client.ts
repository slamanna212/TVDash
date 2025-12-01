// API client for fetching data from the Worker backend

export interface ServiceStatus {
  id: number;
  name: string;
  category: string;
  status: 'operational' | 'degraded' | 'outage' | 'unknown';
  statusText?: string;
  responseTime?: number;
  lastChecked: string;
}

export interface ServicesSummary {
  total: number;
  operational: number;
  degraded: number;
  outage: number;
  unknown: number;
}

export interface ServicesResponse {
  services: ServiceStatus[];
  summary: ServicesSummary;
  lastUpdated: string;
}

export interface CloudRegion {
  key: string;
  name: string;
  location: string;
  provider: string;
  status: 'operational' | 'degraded' | 'outage' | 'unknown';
  affectedIncidents: Array<{
    title: string;
    severity: string;
    startTime: string;
    message?: string;
  }>;
  lastUpdated: string;
}

export interface CloudProvider {
  name: string;
  status: 'operational' | 'degraded' | 'outage' | 'unknown';
  regions: CloudRegion[];
  incidents: Array<{
    title: string;
    severity: string;
    regions?: string[];
    services?: string[];
    startTime: string;
    message?: string;
  }>;
  lastUpdated: string;
}

export interface CloudResponse {
  providers: CloudProvider[];
}

export interface M365Service {
  name: string;
  status: 'operational' | 'degraded' | 'outage' | 'unknown';
  issues: Array<{
    id: string;
    title: string;
    severity: string;
    startTime: string;
    lastUpdate: string;
  }>;
}

export interface M365Response {
  overall: string;
  services: M365Service[];
  lastChecked: string;
}

export interface ISPMetrics {
  isp: {
    id: number;
    name: string;
    primary_asn: number;
    secondary_asns?: string;
  };
  status: 'operational' | 'degraded' | 'outage' | 'unknown';
  metrics: {
    latencyMs: number | null;      // Median latency in ms
    jitterMs: number | null;
  };
  rpki: {
    validPercentage: number;       // % of routes that are RPKI valid
    unknownPercentage: number;     // % of routes with unknown RPKI status
    invalidPercentage: number;     // % of routes that are RPKI invalid
  } | null;
  anomalies: Array<{
    type: string;
    severity: string;
    startTime: string;
    endTime?: string;
  }>;
  bgpIncidents: Array<{
    type: 'hijack' | 'leak';
    description: string;
    startTime: string;
    endTime?: string;
  }>;
  lastChecked: string;
}

export interface InternetResponse {
  overallStatus: 'operational' | 'degraded' | 'outage' | 'unknown';
  isps: ISPMetrics[];
  lastUpdated: string;
}

export interface AttackData {
  layer3: {
    timeseries: Array<{
      timestamp: string;
      value: number;
    }>;
    total: number;
  };
  layer7: {
    timeseries: Array<{
      timestamp: string;
      value: number;
    }>;
    total: number;
  };
  breakdown: {
    byProtocol: Array<{
      name: string;
      value: number;
    }>;
    byVector: Array<{
      name: string;
      value: number;
    }>;
  };
  lastUpdated: string;
}

export interface Event {
  id: number;
  source: string;
  event_type: string;
  severity: 'info' | 'warning' | 'critical';
  title: string;
  description?: string;
  entity_name?: string;
  occurred_at: string;
  resolved_at?: string;
}

export interface EventsResponse {
  events: Event[];
  total: number;
}

class APIClient {
  private baseUrl: string;

  constructor(baseUrl: string = '') {
    this.baseUrl = baseUrl;
  }

  private async fetch<T>(endpoint: string): Promise<T> {
    const response = await fetch(`${this.baseUrl}${endpoint}`);
    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${response.statusText}`);
    }
    return response.json();
  }

  async getServices(): Promise<ServicesResponse> {
    return this.fetch<ServicesResponse>('/api/services');
  }

  async getServiceHistory(id: number, days: number = 7): Promise<any> {
    return this.fetch(`/api/services/${id}/history?days=${days}`);
  }

  async getInternet(): Promise<InternetResponse> {
    return this.fetch<InternetResponse>('/api/internet');
  }

  async getCloud(): Promise<CloudResponse> {
    return this.fetch<CloudResponse>('/api/cloud');
  }

  async getM365(): Promise<M365Response> {
    return this.fetch<M365Response>('/api/m365');
  }

  async getRadarAttacks(): Promise<AttackData> {
    return this.fetch<AttackData>('/api/radar/attacks');
  }

  async getGrid(): Promise<any> {
    return this.fetch('/api/grid');
  }

  async getEvents(params?: { source?: string; limit?: number }): Promise<EventsResponse> {
    const queryParams = new URLSearchParams();
    if (params?.source) queryParams.set('source', params.source);
    if (params?.limit) queryParams.set('limit', params.limit.toString());

    const query = queryParams.toString();
    return this.fetch<EventsResponse>(`/api/events${query ? '?' + query : ''}`);
  }
}

export const apiClient = new APIClient();
