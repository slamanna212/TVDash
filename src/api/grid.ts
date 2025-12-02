import type { Env } from '../types';

export async function getGridStatus(env: Env): Promise<Response> {
  try {
    // Read latest grid status from database
    const result = await env.DB.prepare(`
      SELECT
        region,
        status,
        demand_mw,
        capacity_mw,
        reserve_margin,
        lmp_price,
        fuel_mix,
        alerts,
        checked_at
      FROM grid_status
      ORDER BY checked_at DESC
      LIMIT 1
    `).first();

    if (!result) {
      // No data yet - return unknown status
      return new Response(
        JSON.stringify({
          region: 'PJM',
          status: 'unknown',
          alerts: [],
          checked_at: new Date().toISOString(),
        }),
        {
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Parse JSON fields
    const gridData = {
      region: result.region as string,
      status: result.status as string,
      demand_mw: result.demand_mw as number | undefined,
      capacity_mw: result.capacity_mw as number | undefined,
      reserve_margin: result.reserve_margin as number | undefined,
      lmp_price: result.lmp_price as number | undefined,
      fuel_mix: result.fuel_mix ? JSON.parse(result.fuel_mix as string) as Record<string, number> : undefined,
      alerts: result.alerts ? JSON.parse(result.alerts as string) as string[] : [],
      checked_at: result.checked_at as string,
    };

    return new Response(JSON.stringify(gridData), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error fetching grid status from database:', error);
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
