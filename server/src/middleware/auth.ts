import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config.js';
import { JwtPayload } from '../types/index.js';
import { getDb } from '../db/index.js';
import { getOne } from '../db/helpers.js';

// Extend Express Request to include user
declare global {
    namespace Express {
        interface Request {
            user?: JwtPayload;
        }
    }
}

interface UserVersion {
    token_version: number;
}

export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
    // Get token from Authorization header or cookie
    let token: string | undefined;

    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7);
    }

    // Also check cookies
    if (!token && req.cookies?.token) {
        token = req.cookies.token;
    }

    if (!token) {
        res.status(401).json({ error: 'Authentication required' });
        return;
    }

    try {
        const decoded = jwt.verify(token, config.jwtSecret) as JwtPayload;

        // Check token version against DB
        const db = getDb();
        const result = db.exec('SELECT token_version FROM users WHERE id = ?', [decoded.userId]);
        const user = getOne<UserVersion>(result);

        if (!user || user.token_version !== decoded.tokenVersion) {
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


