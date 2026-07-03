import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config.js';
import { JwtPayload } from '../types/index.js';
import { getCachedTokenVersion } from '../services/user-cache.js';

declare global {
    namespace Express {
        interface Request {
            user?: JwtPayload;
            // Raw request body bytes, captured by the express.json `verify`
            // callback for routes that need byte-exact HMAC verification
            // (see `/webhook` mount in src/index.ts).
            rawBody?: Buffer;
        }
    }
}

export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
    // Cookie-only authentication. Bearer tokens are not accepted — doing so would
    // undermine the SameSite: strict cookie hardening (any stolen JWT could be
    // replayed via the Authorization header, bypassing CSRF protections).
    const token: string | undefined = req.cookies?.token;

    if (!token) {
        res.status(401).json({ error: 'Authentication required' });
        return;
    }

    try {
        const decoded = jwt.verify(token, config.jwtSecret) as JwtPayload;

        const currentVersion = getCachedTokenVersion(decoded.userId);

        if (currentVersion === null || currentVersion !== decoded.tokenVersion) {
            res.status(401).json({ error: 'Session expired or invalidated' });
            return;
        }

        req.user = decoded;
        next();
    } catch {
        res.status(401).json({ error: 'Invalid or expired token' });
    }
}

export function generateToken(payload: Omit<JwtPayload, 'iat' | 'exp'>): string {
    return jwt.sign(payload, config.jwtSecret, { expiresIn: '7d' });
}
