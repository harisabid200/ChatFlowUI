import { Router, Request, Response } from 'express';
import { getDb, saveDatabase } from '../db/index.js';
import { getOne, getAll } from '../db/helpers.js';
import { authMiddleware } from '../middleware/auth.js';
import { v4 as uuid } from 'uuid';
import { Chatbot } from '../types/index.js';
import { z } from 'zod';
import { forwardToWebhook } from '../services/webhook-forwarder.js';
import { getCachedChatbot, invalidateChatbotCache } from '../services/chatbot-cache.js';
import { config } from '../config.js';

interface ChatbotRow {
    id: string;
    name: string;
    webhook_url: string;
    webhook_secret: string | null;
    allowed_origins: string;
    theme_id: string | null;
    custom_css: string | null;
    pre_chat_form: string | null;
    settings: string;
    launcher_logo: string | null;
    header_logo: string | null;
    created_at: string;
    updated_at: string;
}

// Lightweight row type for the list endpoint — excludes logo columns (up to 2MB each)
interface ChatbotListRow extends Omit<ChatbotRow, 'launcher_logo' | 'header_logo'> {}

const router = Router();

// Apply auth to all routes
router.use(authMiddleware);

// Validation schema
const chatbotSchema = z.object({
    name: z.string().min(1).max(100),
    webhookUrl: z.string().url(),
    webhookSecret: z.string().optional(),
    allowedOrigins: z.array(
        z.string().regex(
            /^(https?:\/\/(localhost|[\w.-]+)(:\d+)?(\/.*)?|\*\..+)$/,
            'Each origin must be a valid http/https URL (e.g. https://example.com or http://localhost:3000) or a wildcard domain (e.g. *.example.com)'
        )
    ).min(1, 'At least one allowed origin is required'),
    themeId: z.string().optional(),
    customCss: z.string().optional(),
    preChatForm: z.object({
        enabled: z.boolean(),
        title: z.string(),
        fields: z.array(z.object({
            id: z.string(),
            label: z.string(),
            type: z.enum(['text', 'email', 'phone', 'select']),
            required: z.boolean(),
            placeholder: z.string().optional(),
            options: z.array(z.string()).optional(),
        })),
    }).optional(),
    settings: z.object({
        welcomeMessage: z.string(),
        inputPlaceholder: z.string(),
        headerTitle: z.string(),
        headerSubtitle: z.string().optional(),
        soundEnabled: z.boolean(),
        typingIndicator: z.boolean(),
        showTimestamps: z.boolean(),
    }),
    launcherLogo: z.string().max(2_000_000).optional(),
    headerLogo: z.string().max(2_000_000).optional(),
});

// Helper to transform DB row to API response
function transformChatbot(row: ChatbotRow): Chatbot {
    return {
        id: row.id,
        name: row.name,
        webhookUrl: row.webhook_url,
        webhookSecret: row.webhook_secret || undefined,
        allowedOrigins: JSON.parse(row.allowed_origins),
        themeId: row.theme_id || undefined,
        customCss: row.custom_css || undefined,
        preChatForm: row.pre_chat_form ? JSON.parse(row.pre_chat_form) : undefined,
        settings: JSON.parse(row.settings),
        launcherLogo: row.launcher_logo || undefined,
        headerLogo: row.header_logo || undefined,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
    };
}

// Helper — summary transform for list view (no logos, reduces payload dramatically)
function transformChatbotSummary(row: ChatbotListRow): Chatbot {
    return {
        id: row.id,
        name: row.name,
        webhookUrl: row.webhook_url,
        webhookSecret: row.webhook_secret || undefined,
        allowedOrigins: JSON.parse(row.allowed_origins),
        themeId: row.theme_id || undefined,
        customCss: row.custom_css || undefined,
        preChatForm: row.pre_chat_form ? JSON.parse(row.pre_chat_form) : undefined,
        settings: JSON.parse(row.settings),
        createdAt: row.created_at,
        updatedAt: row.updated_at,
    };
}

// List all chatbots — logos excluded to avoid N × ~4MB payloads on every admin page load
router.get('/', (_req: Request, res: Response) => {
    const db = getDb();
    const result = db.exec(
        `SELECT id, name, webhook_url, webhook_secret, allowed_origins, theme_id,
                custom_css, pre_chat_form, settings, created_at, updated_at
         FROM chatbots ORDER BY created_at DESC`
    );
    const rows = getAll<ChatbotListRow>(result);
    res.json(rows.map(transformChatbotSummary));
});

// Get single chatbot
router.get('/:id', (req: Request, res: Response) => {
    const db = getDb();
    const result = db.exec(
        `SELECT id, name, webhook_url, webhook_secret, allowed_origins, theme_id,
                custom_css, pre_chat_form, settings, launcher_logo, header_logo,
                created_at, updated_at FROM chatbots WHERE id = ?`,
        [req.params.id]
    );
    const row = getOne<ChatbotRow>(result);
    if (!row) {
        res.status(404).json({ error: 'Chatbot not found' });
        return;
    }

    const chatbot = transformChatbot(row);
    res.json(chatbot);
});

// Create chatbot
router.post('/', (req: Request, res: Response) => {
    try {
        const data = chatbotSchema.parse(req.body);
        const id = uuid();
        const db = getDb();

        db.run(`
      INSERT INTO chatbots (id, name, webhook_url, webhook_secret, allowed_origins, theme_id, custom_css, pre_chat_form, settings, launcher_logo, header_logo)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
            id,
            data.name,
            data.webhookUrl,
            data.webhookSecret || null,
            JSON.stringify(data.allowedOrigins),
            data.themeId || 'default',
            data.customCss || null,
            data.preChatForm ? JSON.stringify(data.preChatForm) : null,
            JSON.stringify(data.settings),
            data.launcherLogo || null,
            data.headerLogo || null,
        ]);
        saveDatabase();

        // Fetch timestamps from DB so the response matches what is stored
        // (CURRENT_TIMESTAMP is set by SQLite, not the JS clock)
        const tsResult = db.exec('SELECT created_at, updated_at FROM chatbots WHERE id = ?', [id]);
        const tsRow = getOne<{ created_at: string; updated_at: string }>(tsResult);
        const createdAt = tsRow?.created_at ?? new Date().toISOString();
        const updatedAt = tsRow?.updated_at ?? createdAt;

        res.status(201).json(transformChatbot({
            id,
            name: data.name,
            webhook_url: data.webhookUrl,
            webhook_secret: data.webhookSecret || null,
            allowed_origins: JSON.stringify(data.allowedOrigins),
            theme_id: data.themeId || 'default',
            custom_css: data.customCss || null,
            pre_chat_form: data.preChatForm ? JSON.stringify(data.preChatForm) : null,
            settings: JSON.stringify(data.settings),
            launcher_logo: data.launcherLogo || null,
            header_logo: data.headerLogo || null,
            created_at: createdAt,
            updated_at: updatedAt,
        }));
    } catch (error) {
        if (error instanceof z.ZodError) {
            const firstIssue = error.errors[0];
            const message = firstIssue
                ? `${firstIssue.path.join('.') || 'Field'}: ${firstIssue.message}`
                : 'Validation failed';
            res.status(400).json({ error: message, details: error.errors });
            return;
        }
        console.error('Create chatbot error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Update chatbot
router.put('/:id', (req: Request, res: Response) => {
    try {
        const db = getDb();
        const existingResult = db.exec('SELECT id, created_at FROM chatbots WHERE id = ?', [req.params.id]);
        const existing = getOne<{ id: string; created_at: string }>(existingResult);
        if (!existing) {
            res.status(404).json({ error: 'Chatbot not found' });
            return;
        }

        const data = chatbotSchema.parse(req.body);

        db.run(`
      UPDATE chatbots
      SET name = ?, webhook_url = ?, webhook_secret = ?, allowed_origins = ?,
          theme_id = ?, custom_css = ?, pre_chat_form = ?, settings = ?,
          launcher_logo = ?, header_logo = ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [
            data.name,
            data.webhookUrl,
            data.webhookSecret || null,
            JSON.stringify(data.allowedOrigins),
            data.themeId || 'default',
            data.customCss || null,
            data.preChatForm ? JSON.stringify(data.preChatForm) : null,
            JSON.stringify(data.settings),
            data.launcherLogo || null,
            data.headerLogo || null,
            req.params.id,
        ]);
        saveDatabase();
        invalidateChatbotCache(req.params.id);

        // Fetch updated_at from DB — CURRENT_TIMESTAMP is set by SQLite, not the JS clock
        const updResult = db.exec('SELECT updated_at FROM chatbots WHERE id = ?', [req.params.id]);
        const updRow = getOne<{ updated_at: string }>(updResult);
        const updatedAt = updRow?.updated_at ?? new Date().toISOString();

        res.json(transformChatbot({
            id: req.params.id,
            name: data.name,
            webhook_url: data.webhookUrl,
            webhook_secret: data.webhookSecret || null,
            allowed_origins: JSON.stringify(data.allowedOrigins),
            theme_id: data.themeId || 'default',
            custom_css: data.customCss || null,
            pre_chat_form: data.preChatForm ? JSON.stringify(data.preChatForm) : null,
            settings: JSON.stringify(data.settings),
            launcher_logo: data.launcherLogo || null,
            header_logo: data.headerLogo || null,
            created_at: existing.created_at,
            updated_at: updatedAt,
        }));
    } catch (error) {
        if (error instanceof z.ZodError) {
            const firstIssue = error.errors[0];
            const message = firstIssue
                ? `${firstIssue.path.join('.') || 'Field'}: ${firstIssue.message}`
                : 'Validation failed';
            res.status(400).json({ error: message, details: error.errors });
            return;
        }
        console.error('Update chatbot error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Delete chatbot
router.delete('/:id', (req: Request, res: Response) => {
    // getCachedChatbot always falls through to the DB on a cache miss,
    // so this is a real DB existence check \u2014 not a cache-only guard.
    if (!getCachedChatbot(req.params.id)) {
        res.status(404).json({ error: 'Chatbot not found' });
        return;
    }
    const db = getDb();
    db.run('DELETE FROM chatbots WHERE id = ?', [req.params.id]);
    saveDatabase();
    invalidateChatbotCache(req.params.id);
    res.json({ success: true });
});

// Get embed code
router.get('/:id/embed', (req: Request, res: Response) => {
    const chatbot = getCachedChatbot(req.params.id);
    if (!chatbot) {
        res.status(404).json({ error: 'Chatbot not found' });
        return;
    }

    // Use PUBLIC_URL from config if set — this avoids Host Header injection where an
    // attacker-controlled Host header could poison the generated embed snippet.
    // Falls back to the request host for local dev convenience (set PUBLIC_URL in production).
    let baseUrl = config.publicUrl || `${req.protocol}://${req.get('host')}`;

    // Append BASE_PATH if set and not just '/'
    if (config.basePath && config.basePath !== '/') {
        // Ensure path formatting (remove trailing slash to avoid double slashes)
        const path = config.basePath.endsWith('/') ? config.basePath.slice(0, -1) : config.basePath;
        baseUrl += path.startsWith('/') ? path : `/${path}`;
    }

    const embedCode = `<!-- ChatFlowUI Widget -->
<script>
  (function(w,d,s,o,f,js,fjs){
    w['ChatFlowUI']=o;w[o]=w[o]||function(){(w[o].q=w[o].q||[]).push(arguments)};
    js=d.createElement(s);fjs=d.getElementsByTagName(s)[0];
    js.id=o;js.src=f;js.async=1;fjs.parentNode.insertBefore(js,fjs);
  }(window,document,'script','chatflowui','${baseUrl}/widget/widget.iife.js'));
  
  chatflowui('init', {
    chatbotId: '${req.params.id}',
    baseUrl: '${baseUrl}'
  });
</script>`;

    res.json({ embedCode, baseUrl, chatbotId: req.params.id });
});

// Test message - send a test message through the chatbot's webhook
router.post('/:id/test-message', async (req: Request, res: Response) => {
    try {
        const { sessionId, message } = req.body;

        if (!sessionId || !message) {
            res.status(400).json({ error: 'sessionId and message are required' });
            return;
        }

        if (typeof sessionId !== 'string' || sessionId.length > 256) {
            res.status(400).json({ error: 'sessionId must be a string of at most 256 characters' });
            return;
        }

        if (typeof message !== 'string' || message.length > 4096) {
            res.status(400).json({ error: 'Message too long. Maximum 4096 characters allowed.' });
            return;
        }

        const result = await forwardToWebhook(req.params.id, sessionId, message, {
            source: 'admin-test-chat',
        });

        if (!result.success) {
            res.status(result.statusCode || 502).json({ error: result.error });
            return;
        }

        res.json({
            success: true,
            response: result.response,
        });
    } catch (error) {
        console.error('Test message error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
