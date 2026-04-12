import { getDb } from '../db/index.js';
import { getOne } from '../db/helpers.js';
import type { ThemeConfig } from '../types/index.js';

interface CachedTheme {
    config: string;        // raw JSON for callers that serialise onward
    parsed: ThemeConfig;   // pre-parsed object for the hot widget path
    cachedAt: number;
}

const CACHE_TTL_MS = 60 * 60 * 1000;
const cache = new Map<string, CachedTheme>();

// Private: fetch from DB, parse, populate cache. Returns null if not found.
function loadTheme(themeId: string): CachedTheme | null {
    const db = getDb();
    const result = db.exec('SELECT config FROM themes WHERE id = ?', [themeId]);
    const row = getOne<{ config: string }>(result);

    if (!row) {
        cache.delete(themeId);
        return null;
    }

    const entry: CachedTheme = {
        config: row.config,
        parsed: JSON.parse(row.config) as ThemeConfig,
        cachedAt: Date.now(),
    };
    cache.set(themeId, entry);
    return entry;
}

export function getCachedTheme(themeId: string): string | null {
    const entry = cache.get(themeId);
    if (entry && Date.now() - entry.cachedAt < CACHE_TTL_MS) return entry.config;
    return loadTheme(themeId)?.config ?? null;
}

export function getCachedThemeConfig(themeId: string): ThemeConfig | null {
    const entry = cache.get(themeId);
    if (entry && Date.now() - entry.cachedAt < CACHE_TTL_MS) return entry.parsed;
    return loadTheme(themeId)?.parsed ?? null;
}

export function invalidateThemeCache(themeId: string): void {
    cache.delete(themeId);
}
