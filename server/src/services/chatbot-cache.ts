import { getDb } from '../db/index.js';
import { getOne } from '../db/helpers.js';
import { isOriginInList } from '../utils/origin.js';

interface CachedChatbot {
    id: string;
    name: string;
    webhook_url: string;
    webhook_secret: string | null;
    allowed_origins: string;
    theme_id: string | null;
    custom_css: string | null;
    pre_chat_form: string | null;  // raw JSON (for routes that re-serialise)
    parsed_pre_chat_form: unknown | null; // pre-parsed for hot widget path
    settings: string;             // raw JSON (for routes that re-serialise)
    parsed_settings: Record<string, unknown>; // pre-parsed for hot widget path
    launcher_logo: string | null;
    header_logo: string | null;
    cachedAt: number;
}

const CACHE_TTL_MS = 60 * 60 * 1000;
const cache = new Map<string, CachedChatbot>();

export function getCachedChatbot(id: string): CachedChatbot | null {
    const entry = cache.get(id);

    if (entry && Date.now() - entry.cachedAt < CACHE_TTL_MS) {
        return entry;
    }

    const db = getDb();
    const result = db.exec(
        'SELECT id, name, webhook_url, webhook_secret, allowed_origins, theme_id, custom_css, pre_chat_form, settings, launcher_logo, header_logo FROM chatbots WHERE id = ?',
        [id]
    );
    const row = getOne<Omit<CachedChatbot, 'parsed_settings' | 'cachedAt'>>(result);

    if (!row) {
        cache.delete(id);
        return null;
    }

    const cached: CachedChatbot = {
        ...row,
        parsed_settings: JSON.parse(row.settings) as Record<string, unknown>,
        parsed_pre_chat_form: row.pre_chat_form ? JSON.parse(row.pre_chat_form) : null,
        cachedAt: Date.now(),
    };
    cache.set(id, cached);
    return cached;
}

export function invalidateChatbotCache(id: string): void {
    cache.delete(id);
}

function matchesOrigin(allowedOriginsJson: string, normalizedOrigin: string): boolean {
    try {
        const origins: string[] = JSON.parse(allowedOriginsJson);
        return isOriginInList(normalizedOrigin, origins);
    } catch {
        return false;
    }
}

export function isOriginAllowedByAnyChatbot(normalizedOrigin: string): boolean {
    // Fast path: check in-memory cache for any fresh entry that allows this origin.
    // Cache is used for early ALLOW only — a cache miss never means DENY, because
    // the cache may be a partial view (not all chatbots will have been accessed yet).
    for (const entry of cache.values()) {
        if (Date.now() - entry.cachedAt < CACHE_TTL_MS) {
            if (matchesOrigin(entry.allowed_origins, normalizedOrigin)) return true;
        }
    }

    // Not found in cache — fall through to DB (authoritative source for deny)
    const db = getDb();
    const result = db.exec('SELECT allowed_origins FROM chatbots');
    if (result.length === 0 || result[0].values.length === 0) return false;

    return result[0].values.some(row => matchesOrigin(row[0] as string, normalizedOrigin));
}

