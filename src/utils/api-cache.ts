import type { Env } from '../types';
import { getCachedData, setCachedData } from './cache';

/**
 * Cache wrapper for API endpoints
 * Uses existing api_cache table with TTL-based expiration
 *
 * This provides a second layer of caching:
 * - Layer 1: External API calls cached by collectors (5-10 min TTL)
 * - Layer 2: API responses cached here (30-60 sec TTL)
 *
 * Benefits:
 * - Reduces database queries when frontend polls multiple times
 * - SSE still provides real-time change notifications
 * - Short TTL prevents stale data issues
 */
export async function withApiCache<T>(
  env: Env,
  cacheKey: string,
  ttlSeconds: number,
  fetcher: () => Promise<T>
): Promise<T> {
  // Try cache first
  const cached = await getCachedData<T>(env, cacheKey, 'api-response');
  if (cached !== null) {
    return cached;
  }

  // Cache miss - execute query
  const data = await fetcher();

  // Store in cache (don't await - fire and forget)
  void setCachedData(env, cacheKey, 'api-response', data, ttlSeconds);

  return data;
}

/**
 * Invalidate cache for a specific key or pattern
 * Useful when SSE detects changes and wants to force fresh data
 *
 * @param keyPattern - Exact key or pattern with % wildcard (e.g., 'api:services%')
 */
export async function invalidateApiCache(env: Env, keyPattern: string): Promise<void> {
  try {
    if (keyPattern.includes('%')) {
      // Pattern-based invalidation
      await env.DB.prepare(`
        DELETE FROM api_cache
        WHERE cache_key LIKE ? AND source = 'api-response'
      `).bind(keyPattern).run();
    } else {
      // Exact key invalidation
      await env.DB.prepare(`
        DELETE FROM api_cache
        WHERE cache_key = ? AND source = 'api-response'
      `).bind(keyPattern).run();
    }
  } catch (error) {
    console.error('Error invalidating API cache:', error);
  }
}
