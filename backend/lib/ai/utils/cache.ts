import { LRUCache } from "npm:lru-cache";

// LRU Cache for better memory management
const options = {
  max: 500, // maximum items
  ttl: 1000 * 60 * 60, // 1 hour default
  updateAgeOnGet: false,
  updateAgeOnHas: false,
};

const _cache = new LRUCache<string, any>(options);

export function getCache(key: string): any | null {
  const value = _cache.get(key);
  return value !== undefined ? value : null;
}

export function setCache(
  key: string,
  data: any,
  ttlMs: number = 60 * 60 * 1000,
): void {
  _cache.set(key, data, { ttl: ttlMs });
}

export function invalidateCache(keyPrefix: string): void {
  // node-lru-cache doesn't have native prefix deletion, we iterate and delete
  for (const key of _cache.keys()) {
    if (key.startsWith(keyPrefix)) {
      _cache.delete(key);
    }
  }
}
