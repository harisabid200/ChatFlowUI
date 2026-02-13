import rateLimit from 'express-rate-limit';
import { config } from '../config.js';

// General API rate limiter
export const apiLimiter = rateLimit({
    windowMs: config.rateLimitWindowMs,
    max: config.rateLimitMax,
    message: { error: 'Too many requests, please try again later' },
    standardHeaders: true,
    legacyHeaders: false,
});

// Stricter limiter for auth endpoints
export const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // 10 attempts per 15 minutes
    message: { error: 'Too many login attempts, please try again later' },
    standardHeaders: true,
    legacyHeaders: false,
});

// Widget message rate limiter (per IP)
export const widgetLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 30, // 30 messages per minute
    message: { error: 'Rate limit exceeded. Please slow down.' },
    standardHeaders: true,
    legacyHeaders: false,
});
