import type { Env } from '../types';
import { collectAttackData } from '../collectors/radar/attacks';

export async function getRadarAttacks(env: Env): Promise<Response> {
  try {
    const attackData = await collectAttackData(env);

    return new Response(JSON.stringify(attackData), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error fetching Radar attack data:', error);
    return new Response(JSON.stringify({
      error: 'Failed to fetch attack data',
      message: error instanceof Error ? error.message : 'Unknown error',
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
