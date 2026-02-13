import { Router, Request, Response } from 'express';
import { getDb, saveDatabase } from '../db/index.js';
import { getOne, getAll } from '../db/helpers.js';
import { authMiddleware } from '../middleware/auth.js';
import { v4 as uuid } from 'uuid';
import { Theme, ThemeConfig } from '../types/index.js';
import { z } from 'zod';

interface ThemeRow {
    id: string;
    name: string;
    is_preset: number;
    config: string;
    created_at: string;
}

const router = Router();

// Theme config schema
const themeConfigSchema = z.object({
    name: z.string().min(1).max(50),
    colors: z.object({
        primary: z.string(),
        primaryHover: z.string(),
        background: z.string(),
        headerBg: z.string(),
        headerText: z.string(),
        userMessageBg: z.string(),
        userMessageText: z.string(),
        botMessageBg: z.string(),
        botMessageText: z.string(),
        inputBg: z.string(),
        inputText: z.string(),
        inputBorder: z.string(),
        userAvatarBg: z.string().optional(),
    }),
    typography: z.object({
        fontFamily: z.string(),
        fontSize: z.string(),
        headerFontSize: z.string(),
    }),
    dimensions: z.object({
        width: z.string(),
        height: z.string(),
        borderRadius: z.string(),
        buttonSize: z.string(),
    }),
    position: z.object({
        placement: z.enum(['bottom-right', 'bottom-left']),
        offsetX: z.string(),
        offsetY: z.string(),
    }),
    branding: z.object({
        logo: z.string().optional(),
        title: z.string(),
        subtitle: z.string().optional(),
        welcomeMessage: z.string(),
        inputPlaceholder: z.string(),
    }),
    features: z.object({
        soundEnabled: z.boolean(),
        typingIndicator: z.boolean(),
        showTimestamps: z.boolean(),
    }),
});

// Helper to transform DB row
function transformTheme(row: ThemeRow): Theme {
    const config: ThemeConfig = JSON.parse(row.config);
    // Ensure new fields have defaults for themes created before they were added
    if (!config.colors.userAvatarBg) {
        config.colors.userAvatarBg = '#64748b';
    }
    return {
        id: row.id,
        name: row.name,
        isPreset: row.is_preset === 1,
        config,
        createdAt: row.created_at,
    };
}

// List all themes (protected)
router.get('/', authMiddleware, (_req: Request, res: Response) => {
    const db = getDb();
    const result = db.exec('SELECT * FROM themes ORDER BY is_preset DESC, name ASC');
    const rows = getAll<ThemeRow>(result);
    res.json(rows.map(transformTheme));
});

// Get single theme (protected)
router.get('/:id', authMiddleware, (req: Request, res: Response) => {
    const db = getDb();
    const result = db.exec('SELECT * FROM themes WHERE id = ?', [req.params.id]);
    const row = getOne<ThemeRow>(result);
    if (!row) {
        res.status(404).json({ error: 'Theme not found' });
        return;
    }
    res.json(transformTheme(row));
});

// Create custom theme (protected)
router.post('/', authMiddleware, (req: Request, res: Response) => {
    try {
        const config = themeConfigSchema.parse(req.body);
        const id = uuid();
        const db = getDb();

        db.run(`
      INSERT INTO themes (id, name, is_preset, config)
      VALUES (?, ?, 0, ?)
    `, [id, config.name, JSON.stringify(config)]);
        saveDatabase();

        const result = db.exec('SELECT * FROM themes WHERE id = ?', [id]);
        const row = getOne<ThemeRow>(result);
        if (!row) {
            res.status(500).json({ error: 'Failed to create theme' });
            return;
        }
        res.status(201).json(transformTheme(row));
    } catch (error) {
        if (error instanceof z.ZodError) {
            res.status(400).json({ error: 'Validation failed', details: error.errors });
            return;
        }
        console.error('Create theme error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Update theme (protected, custom themes only)
router.put('/:id', authMiddleware, (req: Request, res: Response) => {
    try {
        const db = getDb();
        const existingResult = db.exec('SELECT * FROM themes WHERE id = ?', [req.params.id]);
        const existing = getOne<ThemeRow>(existingResult);
        if (!existing) {
            res.status(404).json({ error: 'Theme not found' });
            return;
        }

        if (existing.is_preset === 1) {
            res.status(403).json({ error: 'Cannot modify preset themes' });
            return;
        }

        const config = themeConfigSchema.parse(req.body);

        db.run(`
      UPDATE themes SET name = ?, config = ? WHERE id = ?
    `, [config.name, JSON.stringify(config), req.params.id]);
        saveDatabase();

        const result = db.exec('SELECT * FROM themes WHERE id = ?', [req.params.id]);
        const row = getOne<ThemeRow>(result);
        if (!row) {
            res.status(500).json({ error: 'Failed to update theme' });
            return;
        }
        res.json(transformTheme(row));
    } catch (error) {
        if (error instanceof z.ZodError) {
            res.status(400).json({ error: 'Validation failed', details: error.errors });
            return;
        }
        console.error('Update theme error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Delete theme (protected, custom themes only)
router.delete('/:id', authMiddleware, (req: Request, res: Response) => {
    const db = getDb();
    const existingResult = db.exec('SELECT is_preset FROM themes WHERE id = ?', [req.params.id]);
    const existing = getOne<{ is_preset: number }>(existingResult);

    if (!existing) {
        res.status(404).json({ error: 'Theme not found' });
        return;
    }

    if (existing.is_preset === 1) {
        res.status(403).json({ error: 'Cannot delete preset themes' });
        return;
    }

    db.run('DELETE FROM themes WHERE id = ?', [req.params.id]);
    saveDatabase();
    res.json({ success: true });
});

// Duplicate theme (create customizable copy)
router.post('/:id/duplicate', authMiddleware, (req: Request, res: Response) => {
    try {
        const db = getDb();
        const existingResult = db.exec('SELECT * FROM themes WHERE id = ?', [req.params.id]);
        const existing = getOne<ThemeRow>(existingResult);
        if (!existing) {
            res.status(404).json({ error: 'Theme not found' });
            return;
        }

        const config = JSON.parse(existing.config) as ThemeConfig;
        config.name = `${config.name} (Copy)`;
        const id = uuid();

        db.run(`
      INSERT INTO themes (id, name, is_preset, config)
      VALUES (?, ?, 0, ?)
    `, [id, config.name, JSON.stringify(config)]);
        saveDatabase();

        const result = db.exec('SELECT * FROM themes WHERE id = ?', [id]);
        const row = getOne<ThemeRow>(result);
        if (!row) {
            res.status(500).json({ error: 'Failed to duplicate theme' });
            return;
        }
        res.status(201).json(transformTheme(row));
    } catch (error) {
        console.error('Duplicate theme error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
