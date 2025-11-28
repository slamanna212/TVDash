import type { Env } from '../types';
import { collectGWorkspaceStatus } from '../collectors/productivity/gworkspace';

export async function getGWorkspaceStatus(env: Env): Promise<Response> {
  try {
    const workspaceData = await collectGWorkspaceStatus(env);

    return new Response(JSON.stringify(workspaceData), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error fetching Google Workspace status:', error);
    return new Response(JSON.stringify({
      error: 'Failed to fetch Google Workspace status',
      message: error instanceof Error ? error.message : 'Unknown error',
      overall: 'unknown',
      services: [],
      lastChecked: new Date().toISOString(),
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
