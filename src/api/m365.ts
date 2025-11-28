import type { Env } from '../types';
import { collectM365Status } from '../collectors/productivity/microsoft';

export async function getM365Status(env: Env): Promise<Response> {
  try {
    const m365Data = await collectM365Status(env);

    return new Response(JSON.stringify(m365Data), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error fetching M365 status:', error);
    return new Response(JSON.stringify({
      error: 'Failed to fetch M365 status',
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
