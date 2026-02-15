import { Request, Response, NextFunction } from 'express';
import { getDb } from '../db/index.js';
import { getOne } from '../db/helpers.js';
import { config } from '../config.js';

interface ChatbotRow {
    allowed_origins: string;
}

// Dynamic CORS middleware based on chatbot configuration
export function dynamicCorsMiddleware(req: Request, res: Response, next: NextFunction): void {
    const origin = req.headers.origin;
    const chatbotId = req.params.chatbotId;

    // If no origin (same-origin request), allow it
    if (!origin) {
        next();
        return;
    }

    // If no chatbotId in route, use admin CORS (protected by auth)
    if (!chatbotId) {
        // In production, restrict to same origin or ADMIN_ORIGIN env var
        const adminOrigin = process.env.ADMIN_ORIGIN;
        const allowedOrigin = adminOrigin || (process.env.NODE_ENV === 'production' ? undefined : origin);

        if (allowedOrigin) {
            res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
        }
        res.setHeader('Access-Control-Allow-Credentials', 'true');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

        if (req.method === 'OPTIONS') {
            res.status(204).end();
            return;
        }
        next();
        return;
    }

    // Normalize origin (remove trailing slash) for comparison
    const normalizedOrigin = origin.endsWith('/') ? origin.slice(0, -1) : origin;

    // 1. Check Global Environment Variable Allow List (Precedence)
    if (config.corsAllowedOrigins) {
        const globalAllowed = config.corsAllowedOrigins.split(',').map(o => o.trim());
        const isGloballyAllowed = globalAllowed.some(allowed => {
            const normalizedAllowed = allowed.endsWith('/') ? allowed.slice(0, -1) : allowed;
            return normalizedOrigin === normalizedAllowed;
        });

        if (isGloballyAllowed) {
            res.setHeader('Access-Control-Allow-Origin', origin); // Return the actual origin
            res.setHeader('Access-Control-Allow-Credentials', 'true');
            res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
            res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

            if (req.method === 'OPTIONS') {
                res.status(204).end();
                return;
            }
            next();
            return;
        }
    }

    // 2. Check Database for Chatbot-specific allowed origins
    const db = getDb();
    const chatbotResult = db.exec(
        'SELECT allowed_origins FROM chatbots WHERE id = ?',
        [chatbotId]
    );
    const chatbot = getOne<ChatbotRow>(chatbotResult);

    if (!chatbot) {
        res.status(404).json({ error: 'Chatbot not found' });
        return;
    }

    let allowedOrigins: string[];
    try {
        allowedOrigins = JSON.parse(chatbot.allowed_origins);
    } catch {
        allowedOrigins = [];
    }

    // Check if origin is allowed
    const isAllowed = allowedOrigins.some(allowed => {
        // Normalize allowed origin
        const normalizedAllowed = allowed.endsWith('/') ? allowed.slice(0, -1) : allowed;

        // Support wildcard subdomains
        if (allowed.startsWith('*.')) {
            const domain = allowed.slice(2);
            return normalizedOrigin.endsWith(domain) || normalizedOrigin === `https://${domain}` || normalizedOrigin === `http://${domain}`;
        }
        return normalizedOrigin === normalizedAllowed;
    });

    if (!isAllowed) {
        res.status(403).json({ error: 'Origin not allowed' });
        return;
    }

    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.status(204).end();
        return;
    }

    next();
}
