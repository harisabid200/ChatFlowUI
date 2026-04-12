import { Request, Response, NextFunction } from 'express';
import { getCachedChatbot } from '../services/chatbot-cache.js';
import { isOriginInList, globalAllowList, normalizeOrigin } from '../utils/origin.js';
import { config } from '../config.js';

export function dynamicCorsMiddleware(req: Request, res: Response, next: NextFunction): void {
    const origin = req.headers.origin;
    const chatbotId = req.params.chatbotId;

    if (!origin) {
        next();
        return;
    }

    if (!chatbotId) {
        // Normalize to strip any trailing slash — browsers send exact-match origins,
        // a misconfigured ADMIN_ORIGIN with trailing slash would silently break CORS.
        const adminOrigin = config.adminOrigin ? normalizeOrigin(config.adminOrigin) : undefined;
        let allowedOrigin: string | undefined = adminOrigin;

        if (!allowedOrigin && globalAllowList.length > 0 && isOriginInList(origin, globalAllowList)) {
            allowedOrigin = origin;
        }

        if (!allowedOrigin && config.nodeEnv !== 'production') {
            allowedOrigin = origin;
        }

        if (allowedOrigin) {
            res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
            res.setHeader('Vary', 'Origin');
        }
        res.setHeader('Access-Control-Allow-Credentials', 'true');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

        if (req.method === 'OPTIONS') {
            res.status(204).end();
            return;
        }
        next();
        return;
    }

    if (globalAllowList.length > 0 && isOriginInList(origin, globalAllowList)) {
        res.setHeader('Access-Control-Allow-Origin', origin);
        res.setHeader('Vary', 'Origin');
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

    const chatbot = getCachedChatbot(chatbotId);

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

    if (!isOriginInList(origin, allowedOrigins)) {
        res.status(403).json({ error: 'Origin not allowed' });
        return;
    }

    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.status(204).end();
        return;
    }

    next();
}
