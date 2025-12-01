import type { Env } from '../types';
import { collectPJMGridStatus } from '../collectors/grid/eia';

export async function getGridStatus(env: Env): Promise<Response> {
  try {
    const gridData = await collectPJMGridStatus(env);

    return new Response(JSON.stringify(gridData), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error fetching grid status:', error);
    return new Response(
      JSON.stringify({
        error: 'Failed to fetch grid status',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}
