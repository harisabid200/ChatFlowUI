import { LRUCache } from 'lru-cache';
import { getDb } from '../db/index.js';
import { getOne } from '../db/helpers.js';
import { normalizeOrigin, matchesWildcard } from '../utils/origin.js';

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
}

// Bounded LRU cache. Caps memory regardless of how many distinct chatbotIds
// get probed (defends against cache-key amplification attacks too).
// `ttl` here replaces the manual `cachedAt`/CACHE_TTL_MS check we used to do.
const cache = new LRUCache<string, CachedChatbot>({
    max: 200,
    ttl: 60 * 60 * 1000, // 1 hour
});

// =============================================================================
// Origin index — eager, O(1) lookup for "is this origin allowed by ANY chatbot?"
//
// The WS handshake calls isOriginAllowedByAnyChatbot() on every visitor that
// opens the chat across the entire deployment. The previous implementation
// scanned all chatbots × their allowed_origins lists per call (O(N×M)). For
// large multi-tenant deployments this becomes a measurable hot-path cost.
//
// We instead build two lookup structures from the FULL chatbots table at
// startup and rebuild them on every chatbot CUD operation:
//   - exactOriginIndex: Set of normalized exact origins (e.g.
//     "https://example.com"). Membership check is O(1).
//   - wildcardPatterns: Set of "*.domain" patterns. Membership check is O(W)
//     where W is the wildcard count, which is small in practice.
// =============================================================================
const exactOriginIndex = new Set<string>();
const wildcardPatterns = new Set<string>();

function indexOriginsFromJson(json: string): void {
    let origins: unknown;
    try {
        origins = JSON.parse(json);
    } catch {
        return;
    }
    if (!Array.isArray(origins)) return;
    for (const origin of origins) {
        if (typeof origin !== 'string') continue;
        if (origin.startsWith('*.')) {
            wildcardPatterns.add(origin);
        } else {
            exactOriginIndex.add(normalizeOrigin(origin));
        }
    }
}

/**
 * Rebuild the origin index from the full chatbots table.
 * Called at startup and whenever a chatbot is created / updated / deleted.
 *
 * The rebuild is intentionally a full scan rather than incremental: chatbot
 * CUD events are rare (admin-initiated), the chatbot count is bounded, and
 * full rebuild keeps the data structure trivially correct (no orphan entries
 * after edits).
 */
export function rebuildOriginIndex(): void {
    exactOriginIndex.clear();
    wildcardPatterns.clear();

    const db = getDb();
    const result = db.exec('SELECT allowed_origins FROM chatbots');
    if (result.length === 0 || result[0].values.length === 0) return;

    for (const row of result[0].values) {
        const json = row[0];
        if (typeof json === 'string') {
            indexOriginsFromJson(json);
        }
    }
}

export function getCachedChatbot(id: string): CachedChatbot | null {
    const entry = cache.get(id);
    if (entry) return entry;

    const db = getDb();
    const result = db.exec(
        'SELECT id, name, webhook_url, webhook_secret, allowed_origins, theme_id, custom_css, pre_chat_form, settings, launcher_logo, header_logo FROM chatbots WHERE id = ?',
        [id]
    );
    const row = getOne<Omit<CachedChatbot, 'parsed_settings' | 'parsed_pre_chat_form'>>(result);

    if (!row) {
        cache.delete(id);
        return null;
    }

    // Guard against corrupt JSON in DB columns — a single bad row must not
    // turn into an unhandled 500 on every widget config request for that bot.
    let parsedSettings: Record<string, unknown>;
    let parsedPreChat: unknown | null = null;
    try {
        parsedSettings = JSON.parse(row.settings) as Record<string, unknown>;
        parsedPreChat = row.pre_chat_form ? JSON.parse(row.pre_chat_form) : null;
    } catch (err) {
        console.error(`Corrupt JSON in chatbots row ${id} — treating as not found:`, err);
        cache.delete(id);
        return null;
    }

    const cached: CachedChatbot = {
        ...row,
        parsed_settings: parsedSettings,
        parsed_pre_chat_form: parsedPreChat,
    };
    cache.set(id, cached);
    return cached;
}

/**
 * Drop a chatbot's cache entry AND rebuild the origin index.
 *
 * Callers should use this after any DB mutation to a chatbot row (create,
 * update, delete). The rebuild keeps isOriginAllowedByAnyChatbot() correct
 * without per-chatbot bookkeeping.
 */
export function invalidateChatbotCache(id: string): void {
    cache.delete(id);
    rebuildOriginIndex();
}

export function isOriginAllowedByAnyChatbot(normalizedOrigin: string): boolean {
    if (exactOriginIndex.has(normalizedOrigin)) return true;

    // Wildcard match — small set, simple iteration. Delegates to the shared
    // hostname-based matcher so subdomain checks can't be bypassed by
    // suffix-similar domains (e.g. evilexample.com vs *.example.com).
    for (const pattern of wildcardPatterns) {
        if (matchesWildcard(normalizedOrigin, pattern)) return true;
    }
    return false;
}
