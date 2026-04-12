import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { getDb, saveDatabase } from '../db/index.js';
import { getOne } from '../db/helpers.js';
import { generateToken, authMiddleware } from '../middleware/auth.js';
import { authLimiter } from '../middleware/rateLimit.js';
import { invalidateUserCache } from '../services/user-cache.js';

interface UserRow {
    id: number;
    username: string;
    password_hash: string;
    must_change_password: number;
    token_version: number;
}

const router = Router();

// Login
router.post('/login', authLimiter, async (req: Request, res: Response) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            res.status(400).json({ error: 'Username and password required' });
            return;
        }

        const db = getDb();
        const result = db.exec(
            `SELECT id, username, password_hash, must_change_password, token_version
             FROM users WHERE username = ?`,
            [username]
        );
        const user = getOne<UserRow>(result);

        if (!user) {
            res.status(401).json({ error: 'Invalid credentials' });
            return;
        }

        const passwordValid = await bcrypt.compare(password, user.password_hash);

        if (!passwordValid) {
            res.status(401).json({ error: 'Invalid credentials' });
            return;
        }

        const token = generateToken({
            userId: user.id,
            username: user.username,
            tokenVersion: user.token_version || 1,
            mustChangePassword: user.must_change_password === 1,
        });

        // Set cookie
        res.cookie('token', token, {
            httpOnly: true,
            secure: req.secure, // Trust Express 'trust proxy' filtering
            sameSite: 'strict',
            maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        });

        res.json({
            user: {
                id: user.id,
                username: user.username,
                mustChangePassword: user.must_change_password === 1,
            },
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Logout
router.post('/logout', (_req: Request, res: Response) => {
    res.clearCookie('token');
    res.json({ success: true });
});

// Get current user
router.get('/me', authMiddleware, (req: Request, res: Response) => {
    res.json({
        id: req.user!.userId,
        username: req.user!.username,
        mustChangePassword: req.user!.mustChangePassword,
    });
});

// Change password
router.post('/change-password', authMiddleware, async (req: Request, res: Response) => {
    try {
        const { currentPassword, newPassword } = req.body;

        if (!newPassword || newPassword.length < 12) {
            res.status(400).json({ error: 'New password must be at least 12 characters' });
            return;
        }

        const db = getDb();
        const result = db.exec(
            `SELECT password_hash, must_change_password, token_version FROM users WHERE id = ?`,
            [req.user!.userId]
        );
        const user = getOne<UserRow>(result);

        if (!user) {
            res.status(404).json({ error: 'User not found' });
            return;
        }

        // If not first-time password change, verify current password
        if (user.must_change_password !== 1) {
            if (!currentPassword) {
                res.status(400).json({ error: 'Current password required' });
                return;
            }
            const passwordValid = await bcrypt.compare(currentPassword, user.password_hash);
            if (!passwordValid) {
                res.status(401).json({ error: 'Current password is incorrect' });
                return;
            }
        }

        // Hash new password and update
        // ALERT: Increment token_version to invalidate all existing sessions
        const newHash = await bcrypt.hash(newPassword, 12);
        const newTokenVersion = (user.token_version || 1) + 1;

        db.run(
            `UPDATE users SET password_hash = ?, must_change_password = 0, token_version = ? WHERE id = ?`,
            [newHash, newTokenVersion, req.user!.userId]
        );
        saveDatabase();
        invalidateUserCache(req.user!.userId);

        const freshToken = generateToken({
            userId: req.user!.userId,
            username: req.user!.username,
            tokenVersion: newTokenVersion,
            mustChangePassword: false,
        });

        res.cookie('token', freshToken, {
            httpOnly: true,
            secure: req.secure,
            sameSite: 'strict',
            maxAge: 7 * 24 * 60 * 60 * 1000,
        });

        res.json({ success: true });
    } catch (error) {
        console.error('Change password error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
