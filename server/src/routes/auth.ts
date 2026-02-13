import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { getDb, saveDatabase } from '../db/index.js';
import { getOne } from '../db/helpers.js';
import { config } from '../config.js';
import { generateToken, authMiddleware } from '../middleware/auth.js';
import { authLimiter } from '../middleware/rateLimit.js';

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
        const result = db.exec(`SELECT * FROM users WHERE username = ?`, [username]);
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
            tokenVersion: user.token_version || 1, // Default to 1 if null (migration)
        });

        // Set cookie
        res.cookie('token', token, {
            httpOnly: true,
            secure: config.nodeEnv === 'production',
            sameSite: 'strict',
            maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        });

        res.json({
            token,
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
router.post('/logout', (req: Request, res: Response) => {
    // Invalidate session by incrementing token version
    // We try to decode the token even if it's not verified by middleware to get userId
    // But safely, we only invalidate if we know the user.
    // Actually, logout is often called without auth if token expired.
    // If we have a user on the request (from authMiddleware or just parsed), we use it.

    // However, the standard logout just clears cookie. 
    // To truly invalidate, we need to know who it is.
    // If the token is already invalid, we don't need to invalidate it further.
    // But if the user clicks "Logout", they might still have a valid token.

    // Better approach: verify token first. If valid, increment version.
    // If invalid/missing, just clear cookie.

    const token = req.cookies.token || req.headers.authorization?.split(' ')[1];
    if (token) {
        try {
            // We use a lenient verify just to get the ID, or rely on authMiddleware if this route was protected.
            // But this route is NOT protected in the original code.
            // Let's decode without verifying to get ID, then increment.
            // Wait, unsafe to increment based on unverified token? No, user can only hurt themselves.
            // A better way is to make logout protected? No, then you can't logout if expired.

            // For now, let's just clear cookie. The explicit invalidation happens on change-password.
            // If we really want "Logout = Global Logout", we need auth.
            // Let's keep it simple: Logout = Browser forgets token.
            // Token Versioning is mainly for "Change Password" or "Revoke All Sessions" admin action.
        } catch { }
    }

    res.clearCookie('token');
    res.json({ success: true });
});

// Get current user
router.get('/me', authMiddleware, (req: Request, res: Response) => {
    const db = getDb();
    const result = db.exec(
        `SELECT id, username, must_change_password FROM users WHERE id = ?`,
        [req.user!.userId]
    );
    const user = getOne<UserRow>(result);

    if (!user) {
        res.status(404).json({ error: 'User not found' });
        return;
    }

    res.json({
        id: user.id,
        username: user.username,
        mustChangePassword: user.must_change_password === 1,
    });
});

// Change password
router.post('/change-password', authMiddleware, async (req: Request, res: Response) => {
    try {
        const { currentPassword, newPassword } = req.body;

        if (!newPassword || newPassword.length < 8) {
            res.status(400).json({ error: 'New password must be at least 8 characters' });
            return;
        }

        const db = getDb();
        const result = db.exec(`SELECT * FROM users WHERE id = ?`, [req.user!.userId]);
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

        res.json({ success: true });
    } catch (error) {
        console.error('Change password error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
