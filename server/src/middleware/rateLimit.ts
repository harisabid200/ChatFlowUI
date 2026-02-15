import rateLimit, { Store, Options, IncrementResponse } from 'express-rate-limit';
import { config } from '../config.js';
import { getDb } from '../db/index.js';

class SqliteStore implements Store {
    windowMs!: number;
    prefix: string;

    constructor(prefix: string) {
        this.prefix = prefix;
    }

    init(options: Options) {
        this.windowMs = options.windowMs;
    }

    async increment(key: string): Promise<IncrementResponse> {
        const db = getDb();
        const now = Date.now();
        const dbKey = `${this.prefix}:${key}`;

        const stmt = db.prepare("SELECT points, expiry FROM rate_limits WHERE key = ?");
        stmt.bind([dbKey]);

        let totalHits = 0;
        let resetTime: Date;

        if (stmt.step()) {
            const result = stmt.getAsObject();
            const points = result.points as number;
            const expiry = result.expiry as number;

            if (expiry > now) {
                totalHits = points + 1;
                resetTime = new Date(expiry);
                db.run("UPDATE rate_limits SET points = ? WHERE key = ?", [totalHits, dbKey]);
            } else {
                totalHits = 1;
                resetTime = new Date(now + this.windowMs);
                // Use UPDATE or INSERT OR REPLACE?
                // If it existed but expired, we want to reset it.
                // REPLACE is easier.
                db.run("INSERT OR REPLACE INTO rate_limits (key, points, expiry) VALUES (?, ?, ?)",
                    [dbKey, totalHits, resetTime.getTime()]);
            }
        } else {
            totalHits = 1;
            resetTime = new Date(now + this.windowMs);
            db.run("INSERT OR REPLACE INTO rate_limits (key, points, expiry) VALUES (?, ?, ?)",
                [dbKey, totalHits, resetTime.getTime()]);
        }
        stmt.free();

        return {
            totalHits,
            resetTime,
        };
    }

    async decrement(key: string): Promise<void> {
        const db = getDb();
        const dbKey = `${this.prefix}:${key}`;
        db.run("UPDATE rate_limits SET points = points - 1 WHERE key = ?", [dbKey]);
    }

    async resetKey(key: string): Promise<void> {
        const db = getDb();
        const dbKey = `${this.prefix}:${key}`;
        db.run("DELETE FROM rate_limits WHERE key = ?", [dbKey]);
    }
}

// General API rate limiter
export const apiLimiter = rateLimit({
    windowMs: config.rateLimitWindowMs,
    max: config.rateLimitMax,
    message: { error: 'Too many requests, please try again later' },
    standardHeaders: true,
    legacyHeaders: false,
    store: new SqliteStore('api'),
});

// Stricter limiter for auth endpoints
export const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // 10 attempts per 15 minutes
    message: { error: 'Too many login attempts, please try again later' },
    standardHeaders: true,
    legacyHeaders: false,
    store: new SqliteStore('auth'),
});

// Widget message rate limiter (per IP)
export const widgetLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 30, // 30 messages per minute
    message: { error: 'Rate limit exceeded. Please slow down.' },
    standardHeaders: true,
    legacyHeaders: false,
    store: new SqliteStore('widget'),
});
