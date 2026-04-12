import { config } from '../config.js';

export function normalizeOrigin(origin: string): string {
    return origin.endsWith('/') ? origin.slice(0, -1) : origin;
}

export function isOriginInList(origin: string, allowedOrigins: string[]): boolean {
    const normalized = normalizeOrigin(origin);
    return allowedOrigins.some(allowed => {
        if (allowed.startsWith('*.')) {
            const domain = allowed.slice(2);
            return normalized.endsWith(domain) ||
                normalized === `https://${domain}` ||
                normalized === `http://${domain}`;
        }
        return normalized === normalizeOrigin(allowed);
    });
}

export const globalAllowList: string[] = config.corsAllowedOrigins
    ? config.corsAllowedOrigins.split(',').map(o => o.trim()).filter(Boolean)
    : [];
