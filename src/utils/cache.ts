import type { Env } from '../types';

export async function getCachedData<T>(
  env: Env,
  cacheKey: string,
  source: string
): Promise<T | null> {
  try {
    const result = await env.DB.prepare(`
      SELECT data, expires_at
      FROM api_cache
      WHERE cache_key = ?
    `).bind(cacheKey).first();

    if (!result) {
      return null;
    }

    // Check if expired
    const expiresAt = new Date(result.expires_at as string);
    if (expiresAt < new Date()) {
      // Delete expired entry
      await env.DB.prepare('DELETE FROM api_cache WHERE cache_key = ?')
        .bind(cacheKey)
        .run();
      return null;
    }

    return JSON.parse(result.data as string) as T;
  } catch (error) {
    console.error('Error getting cached data:', error);
    return null;
  }
}

export async function setCachedData(
  env: Env,
  cacheKey: string,
  source: string,
  data: any,
  ttlSeconds: number
): Promise<void> {
  try {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + ttlSeconds * 1000);

    await env.DB.prepare(`
      INSERT INTO api_cache (cache_key, source, data, fetched_at, expires_at)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(cache_key) DO UPDATE SET
        data = excluded.data,
        fetched_at = excluded.fetched_at,
        expires_at = excluded.expires_at
    `)
      .bind(
        cacheKey,
        source,
        JSON.stringify(data),
        now.toISOString(),
        expiresAt.toISOString()
      )
      .run();
  } catch (error) {
    console.error('Error setting cached data:', error);
  }
}

export async function fetchWithCache<T>(
  env: Env,
  cacheKey: string,
  source: string,
  fetcher: () => Promise<T>,
  ttlSeconds = 240 // Default 4 minutes
): Promise<T> {
  // Try to get from cache first
  const cached = await getCachedData<T>(env, cacheKey, source);
  if (cached !== null) {
    return cached;
  }

  // Cache miss - fetch fresh data
  const data = await fetcher();

  // Store in cache
  await setCachedData(env, cacheKey, source, data, ttlSeconds);

  return data;
}
