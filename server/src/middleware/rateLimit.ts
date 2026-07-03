import rateLimit, { MemoryStore } from 'express-rate-limit';
import { Request } from 'express';
import { config } from '../config.js';

// Explicit stores so the test-only flush endpoint can reset them between runs.
// Each limiter MUST get its own store — sharing would cause counts to mix.
const apiStore = new MemoryStore();
const authStore = new MemoryStore();
const widgetStore = new MemoryStore();
const webhookStore = new MemoryStore();

/**
 * Key generator for the widget and webhook limiters.
 *
 * Why per-chatbotId instead of per-IP:
 *   - n8n workflows route every customer's webhook callbacks through the
 *     same n8n host IP. With IP-only keying, one busy chatbot starves all
 *     other chatbots that share that source IP.
 *   - Visitor traffic to /widget/:chatbotId/message can also share an
 *     upstream IP (NAT, proxy) for unrelated tenants.
 *
 * Falls back to IP when chatbotId is missing (defence-in-depth — the
 * underlying routes use /:chatbotId path params, so this should always be
 * present, but we don't want a malformed request to bypass the limit).
 *
 * IMPORTANT: this middleware MUST be attached AFTER the path-with-params has
 * been matched (i.e. on the route, not via router.use()) so that
 * req.params.chatbotId is populated.
 */
const chatbotKey = (req: Request): string => {
    const id = req.params.chatbotId;
    if (typeof id === 'string' && id.length > 0 && id.length <= 64) {
        return `cb:${id}`;
    }
    // Fallback: standard IP keying. Matches express-rate-limit's own default
    // behaviour. IPv6 hosts sharing a /64 each get their own bucket; that's
    // acceptable here because chatbotId is the primary key for these limits.
    return `ip:${req.ip ?? 'unknown'}`;
};

export const apiLimiter = rateLimit({
    windowMs: config.rateLimitWindowMs,
    max: config.rateLimitMax,
    message: { error: 'Too many requests, please try again later' },
    standardHeaders: true,
    legacyHeaders: false,
    store: apiStore,
});

export const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    message: { error: 'Too many login attempts, please try again later' },
    standardHeaders: true,
    legacyHeaders: false,
    store: authStore,
});

export const widgetLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 30,
    message: { error: 'Rate limit exceeded. Please slow down.' },
    standardHeaders: true,
    legacyHeaders: false,
    store: widgetStore,
    keyGenerator: chatbotKey,
});

export const webhookLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 60,
    message: { error: 'Too many requests' },
    standardHeaders: true,
    legacyHeaders: false,
    store: webhookStore,
    keyGenerator: chatbotKey,
});

// Exported for the test-only POST /api/auth/flush-rate-limits endpoint.
// Order is informational only — `resetAll()` clears each store independently.
export const rateLimitStores: MemoryStore[] = [
    apiStore,
    authStore,
    widgetStore,
    webhookStore,
];
