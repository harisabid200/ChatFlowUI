import { config } from '../config.js';

export function normalizeOrigin(origin: string): string {
    return origin.endsWith('/') ? origin.slice(0, -1) : origin;
}

/**
 * Hostname-based wildcard match for `*.example.com` patterns.
 *
 * SECURITY: must compare against the parsed hostname, never the raw origin
 * string. A naive `origin.endsWith('example.com')` also matches
 * `https://evilexample.com` (substring suffix, not a subdomain).
 */
export function matchesWildcard(origin: string, pattern: string): boolean {
    const domain = pattern.slice(2); // strip '*.'
    let hostname: string;
    try {
        hostname = new URL(origin).hostname;
    } catch {
        return false;
    }
    return hostname === domain || hostname.endsWith(`.${domain}`);
}

export function isOriginInList(origin: string, allowedOrigins: string[]): boolean {
    const normalized = normalizeOrigin(origin);
    return allowedOrigins.some(allowed => {
        if (allowed.startsWith('*.')) {
            return matchesWildcard(normalized, allowed);
        }
        return normalized === normalizeOrigin(allowed);
    });
}

export const globalAllowList: string[] = config.corsAllowedOrigins
    ? config.corsAllowedOrigins.split(',').map(o => o.trim()).filter(Boolean)
    : [];
