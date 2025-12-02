import type { CheckResult, ServiceStatus } from '../types';

interface StatuspageComponent {
  id: string;
  name: string;
  status: string;
  group_id: string | null;
  group: boolean;
  components?: string[];
}

interface StatuspageResponse {
  status: {
    indicator: string;
    description: string;
  };
  components?: StatuspageComponent[];
}

export async function checkStatuspageStatus(statuspageUrl: string): Promise<CheckResult> {
  // Delegate to the new function with no group filtering (backward compatible)
  return checkStatuspageStatusWithGroups(statuspageUrl, null);
}

function mapStatuspageIndicator(indicator: string): ServiceStatus {
  switch (indicator.toLowerCase()) {
    case 'none':
      return 'operational';
    case 'minor':
      return 'degraded';
    case 'major':
    case 'critical':
      return 'outage';
    default:
      return 'unknown';
  }
}

function determineStatusFromComponents(components: Array<{ name: string; status: string }>): ServiceStatus {
  const hasOutage = components.some(c =>
    c.status === 'major_outage' || c.status === 'partial_outage'
  );
  const hasDegraded = components.some(c =>
    c.status === 'degraded_performance' || c.status === 'under_maintenance'
  );

  if (hasOutage) {return 'outage';}
  if (hasDegraded) {return 'degraded';}
  return 'operational';
}

function statusPriority(status: ServiceStatus): number {
  const priorities = {
    'unknown': 0,
    'operational': 1,
    'degraded': 2,
    'outage': 3,
  };
  return priorities[status] || 0;
}

/**
 * Filter components to only those belonging to specified groups
 * @param allComponents - All components from the API response
 * @param groupNames - Array of group names to filter by (e.g., ["Datto BCDR Devices"])
 * @returns Array of components that belong to the specified groups
 */
function filterComponentsByGroups(
  allComponents: StatuspageComponent[],
  groupNames: string[]
): StatuspageComponent[] {
  // Step 1: Find group objects by name and extract their IDs
  const targetGroups = allComponents.filter(
    c => c.group === true && groupNames.includes(c.name)
  );

  const targetGroupIds = new Set(targetGroups.map(g => g.id));

  // Step 2: Filter components that have a group_id matching our target groups
  const filteredComponents = allComponents.filter(
    c => c.group === false && c.group_id && targetGroupIds.has(c.group_id)
  );

  return filteredComponents;
}

/**
 * Check statuspage status with optional component group filtering
 * @param statuspageUrl - Base URL of the statuspage
 * @param componentGroupNames - Optional array of group names to filter (e.g., ["Datto BCDR Devices"])
 */
export async function checkStatuspageStatusWithGroups(
  statuspageUrl: string,
  componentGroupNames?: string[] | null
): Promise<CheckResult> {
  const startTime = Date.now();

  try {
    // Ensure URL ends with /api/v2/summary.json
    let apiUrl = statuspageUrl;
    if (!apiUrl.endsWith('/api/v2/summary.json')) {
      apiUrl = apiUrl.replace(/\/$/, '');
      apiUrl = `${apiUrl}/api/v2/summary.json`;
    }

    const response = await fetch(apiUrl, {
      headers: {
        'User-Agent': 'MSP-Dashboard-Monitor/1.0',
        'Accept': 'application/json',
      },
    });

    const responseTime = Date.now() - startTime;

    if (!response.ok) {
      return {
        status: 'unknown',
        responseTime,
        message: `API returned ${response.status}`,
      };
    }

    const data: StatuspageResponse = await response.json();

    let finalStatus: ServiceStatus;

    // If component groups are specified, ONLY use those components (ignore overall page status)
    if (componentGroupNames && componentGroupNames.length > 0 && data.components && data.components.length > 0) {
      const componentsToCheck = filterComponentsByGroups(data.components, componentGroupNames);

      if (componentsToCheck.length > 0) {
        finalStatus = determineStatusFromComponents(componentsToCheck);
      } else {
        // No components found for the specified groups - this might indicate a problem
        console.warn('No components found for groups:', componentGroupNames);
        finalStatus = 'unknown';
      }
    } else {
      // No filtering: use overall page status + all components
      const status = mapStatuspageIndicator(data.status.indicator);
      finalStatus = status;

      if (data.components && data.components.length > 0) {
        const componentsToCheck = data.components.filter(c => !c.group);
        if (componentsToCheck.length > 0) {
          const componentStatus = determineStatusFromComponents(componentsToCheck);
          // Use the worse of the two statuses
          if (statusPriority(componentStatus) > statusPriority(finalStatus)) {
            finalStatus = componentStatus;
          }
        }
      }
    }

    return {
      status: finalStatus,
      responseTime,
      message: data.status.description,
    };
  } catch (error) {
    const responseTime = Date.now() - startTime;
    return {
      status: 'unknown',
      responseTime,
      message: error instanceof Error ? error.message : 'Failed to check status',
    };
  }
}
