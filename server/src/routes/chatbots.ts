import { Router, Request, Response } from 'express';
import { getDb, saveDatabase } from '../db/index.js';
import { getOne, getAll } from '../db/helpers.js';
import { authMiddleware } from '../middleware/auth.js';
import { v4 as uuid } from 'uuid';
import { Chatbot } from '../types/index.js';
import { z } from 'zod';
import { forwardToWebhook } from '../services/webhook-forwarder.js';
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

const router = Router();

// Apply auth to all routes
router.use(authMiddleware);

// Validation schema
const chatbotSchema = z.object({
    name: z.string().min(1).max(100),
    webhookUrl: z.string().url(),
    webhookSecret: z.string().optional(),
    allowedOrigins: z.array(z.string()).min(1),
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
    launcherLogo: z.string().optional(),
    headerLogo: z.string().optional(),
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

// List all chatbots
router.get('/', (_req: Request, res: Response) => {
    const db = getDb();
    const result = db.exec('SELECT * FROM chatbots ORDER BY created_at DESC');
    const rows = getAll<ChatbotRow>(result);
    res.json(rows.map(transformChatbot));
});

// Get single chatbot
router.get('/:id', (req: Request, res: Response) => {
    const db = getDb();
    const result = db.exec('SELECT * FROM chatbots WHERE id = ?', [req.params.id]);
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

        const result = db.exec('SELECT * FROM chatbots WHERE id = ?', [id]);
        const row = getOne<ChatbotRow>(result);
        if (!row) {
            res.status(500).json({ error: 'Failed to create chatbot' });
            return;
        }
        res.status(201).json(transformChatbot(row));
    } catch (error) {
        if (error instanceof z.ZodError) {
            res.status(400).json({ error: 'Validation failed', details: error.errors });
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
        const existingResult = db.exec('SELECT id FROM chatbots WHERE id = ?', [req.params.id]);
        if (existingResult.length === 0 || existingResult[0].values.length === 0) {
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

        const result = db.exec('SELECT * FROM chatbots WHERE id = ?', [req.params.id]);
        const row = getOne<ChatbotRow>(result);
        if (!row) {
            res.status(500).json({ error: 'Failed to update chatbot' });
            return;
        }
        res.json(transformChatbot(row));
    } catch (error) {
        if (error instanceof z.ZodError) {
            res.status(400).json({ error: 'Validation failed', details: error.errors });
            return;
        }
        console.error('Update chatbot error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Delete chatbot
router.delete('/:id', (req: Request, res: Response) => {
    const db = getDb();
    const existingResult = db.exec('SELECT id FROM chatbots WHERE id = ?', [req.params.id]);
    if (existingResult.length === 0 || existingResult[0].values.length === 0) {
        res.status(404).json({ error: 'Chatbot not found' });
        return;
    }
    db.run('DELETE FROM chatbots WHERE id = ?', [req.params.id]);
    saveDatabase();
    res.json({ success: true });
});

// Get embed code
router.get('/:id/embed', (req: Request, res: Response) => {
    const db = getDb();
    const result = db.exec('SELECT id FROM chatbots WHERE id = ?', [req.params.id]);
    if (result.length === 0 || result[0].values.length === 0) {
        res.status(404).json({ error: 'Chatbot not found' });
        return;
    }

    // Construct base URL with BASE_PATH support
    let baseUrl = `${req.protocol}://${req.get('host')}`;

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
    chatbotId: '${req.params.id}'
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

        // Verify chatbot exists
        const db = getDb();
        const existingResult = db.exec('SELECT id FROM chatbots WHERE id = ?', [req.params.id]);
        if (existingResult.length === 0 || existingResult[0].values.length === 0) {
            res.status(404).json({ error: 'Chatbot not found' });
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
