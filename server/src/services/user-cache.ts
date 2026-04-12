import { getDb } from '../db/index.js';
import { getOne } from '../db/helpers.js';

interface CachedUserVersion {
    token_version: number;
    cachedAt: number;
}

const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes
const cache = new Map<number, CachedUserVersion>();

export function getCachedTokenVersion(userId: number): number | null {
    const entry = cache.get(userId);

    if (entry && Date.now() - entry.cachedAt < CACHE_TTL_MS) {
        return entry.token_version;
    }

    const db = getDb();
    const result = db.exec('SELECT token_version FROM users WHERE id = ?', [userId]);
    const row = getOne<{ token_version: number | null }>(result);

    if (!row) {
        cache.delete(userId);
        return null;
    }

    // Coerce NULL (pre-migration rows) to 1 so they match tokens issued with || 1
    const version = row.token_version ?? 1;
    cache.set(userId, { token_version: version, cachedAt: Date.now() });
    return version;
}

export function invalidateUserCache(userId: number): void {
    cache.delete(userId);
}
