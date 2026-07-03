import { LRUCache } from 'lru-cache';
import { getDb } from '../db/index.js';
import { getOne } from '../db/helpers.js';
import type { ThemeConfig } from '../types/index.js';

interface CachedTheme {
    config: string;        // raw JSON for callers that serialise onward
    parsed: ThemeConfig;   // pre-parsed object for the hot widget path
}

// Bounded LRU. There are ~10 preset themes and N custom themes (small N), so
// 50 is generous; the cap mostly defends against cache-key probing.
const cache = new LRUCache<string, CachedTheme>({
    max: 50,
    ttl: 60 * 60 * 1000, // 1 hour
});

// Private: fetch from DB, parse, populate cache. Returns null if not found.
function loadTheme(themeId: string): CachedTheme | null {
    const db = getDb();
    const result = db.exec('SELECT config FROM themes WHERE id = ?', [themeId]);
    const row = getOne<{ config: string }>(result);

    if (!row) {
        cache.delete(themeId);
        return null;
    }

    // Guard against corrupt theme JSON — fall back to "not found" so callers
    // take their default-theme path instead of throwing a 500.
    let parsed: ThemeConfig;
    try {
        parsed = JSON.parse(row.config) as ThemeConfig;
    } catch (err) {
        console.error(`Corrupt JSON in themes row ${themeId} — treating as not found:`, err);
        cache.delete(themeId);
        return null;
    }

    const entry: CachedTheme = {
        config: row.config,
        parsed,
    };
    cache.set(themeId, entry);
    return entry;
}

export function getCachedTheme(themeId: string): string | null {
    const entry = cache.get(themeId);
    if (entry) return entry.config;
    return loadTheme(themeId)?.config ?? null;
}

export function getCachedThemeConfig(themeId: string): ThemeConfig | null {
    const entry = cache.get(themeId);
    if (entry) return entry.parsed;
    return loadTheme(themeId)?.parsed ?? null;
}

export function invalidateThemeCache(themeId: string): void {
    cache.delete(themeId);
}
