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

export interface CloudProvider {
  name: string;
  status: 'operational' | 'degraded' | 'outage' | 'unknown';
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

export interface GWorkspaceService {
  name: string;
  status: 'operational' | 'degraded' | 'outage' | 'unknown';
  incident?: {
    title: string;
    description: string;
    startTime: string;
  };
}

export interface GWorkspaceResponse {
  overall: string;
  services: GWorkspaceService[];
  lastChecked: string;
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

  async getInternet(): Promise<any> {
    return this.fetch('/api/internet');
  }

  async getCloud(): Promise<CloudResponse> {
    return this.fetch<CloudResponse>('/api/cloud');
  }

  async getM365(): Promise<M365Response> {
    return this.fetch<M365Response>('/api/m365');
  }

  async getGWorkspace(): Promise<GWorkspaceResponse> {
    return this.fetch<GWorkspaceResponse>('/api/gworkspace');
  }

  async getRadarAttacks(): Promise<any> {
    return this.fetch('/api/radar/attacks');
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
