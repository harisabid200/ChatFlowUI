import { Router, Request, Response } from 'express';
import { getDb } from '../db/index.js';
import { getOne } from '../db/helpers.js';
import { dynamicCorsMiddleware } from '../middleware/cors.js';
import { widgetLimiter } from '../middleware/rateLimit.js';
import { ThemeConfig } from '../types/index.js';
import { forwardToWebhook } from '../services/webhook-forwarder.js';

// Sanitize custom CSS to prevent XSS and data exfiltration
function sanitizeCss(css: string): string {
    return css
        // Remove url() calls (data exfiltration)
        .replace(/url\s*\([^)]*\)/gi, '/* url removed */')
        // Remove @import (external stylesheet injection)
        .replace(/@import\s+[^;]+;?/gi, '/* import removed */')
        // Remove expression() (IE script execution)
        .replace(/expression\s*\([^)]*\)/gi, '/* expression removed */')
        // Remove javascript: protocol
        .replace(/javascript\s*:/gi, '/* removed */')
        // Remove behavior: property (IE HTC loading)
        .replace(/behavior\s*:/gi, '/* removed */')
        // Remove -moz-binding (Firefox XBL injection)
        .replace(/-moz-binding\s*:/gi, '/* removed */');
}

interface ChatbotRow {
    id: string;
    name: string;
    webhook_url: string;
    theme_id: string | null;
    custom_css: string | null;
    pre_chat_form: string | null;
    settings: string;
    launcher_logo: string | null;
    header_logo: string | null;
}

interface ThemeRow {
    config: string;
}

// parseN8nResponse has been moved to ../services/webhook-forwarder.ts

const router = Router();

// Handle CORS preflight for all widget routes
router.options('/:chatbotId/*', dynamicCorsMiddleware);

// Get widget configuration (public, CORS-restricted)
router.get('/:chatbotId/config', dynamicCorsMiddleware, (req: Request, res: Response) => {
    const db = getDb();
    const chatbotResult = db.exec(`
    SELECT id, name, theme_id, custom_css, pre_chat_form, settings, launcher_logo, header_logo
    FROM chatbots WHERE id = ?
  `, [req.params.chatbotId]);
    const chatbot = getOne<ChatbotRow>(chatbotResult);

    if (!chatbot) {
        res.status(404).json({ error: 'Chatbot not found' });
        return;
    }

    // Get theme config
    let theme: ThemeConfig | null = null;
    if (chatbot.theme_id) {
        const themeResult = db.exec('SELECT config FROM themes WHERE id = ?', [chatbot.theme_id]);
        const themeRow = getOne<ThemeRow>(themeResult);
        if (themeRow) {
            theme = JSON.parse(themeRow.config);
        }
    }

    // Fallback to default theme
    if (!theme) {
        const defaultResult = db.exec("SELECT config FROM themes WHERE id = 'default'");
        const defaultTheme = getOne<ThemeRow>(defaultResult);
        if (defaultTheme) {
            theme = JSON.parse(defaultTheme.config);
        }
    }

    const settings = JSON.parse(chatbot.settings);

    // Add logos to settings if they exist
    if (chatbot.launcher_logo) {
        settings.launcherLogo = chatbot.launcher_logo;
    }
    if (chatbot.header_logo) {
        settings.headerLogo = chatbot.header_logo;
    }

    res.json({
        chatbotId: chatbot.id,
        name: chatbot.name,
        theme,
        customCss: chatbot.custom_css ? sanitizeCss(chatbot.custom_css) : null,
        preChatForm: chatbot.pre_chat_form ? JSON.parse(chatbot.pre_chat_form) : null,
        settings,
    });
});

// Send message from widget (proxy to webhook)
router.post('/:chatbotId/message', dynamicCorsMiddleware, widgetLimiter, async (req: Request, res: Response) => {
    try {
        const { sessionId, message, metadata } = req.body;

        if (!sessionId || !message) {
            res.status(400).json({ error: 'sessionId and message are required' });
            return;
        }

        if (message.length > 4096) {
            res.status(400).json({ error: 'Message too long. Maximum 4096 characters allowed.' });
            return;
        }

        const result = await forwardToWebhook(req.params.chatbotId, sessionId, message, metadata);

        if (!result.success) {
            res.status(result.statusCode || 500).json({ error: result.error });
            return;
        }

        res.json({
            success: true,
            response: result.response,
        });
    } catch (error) {
        console.error('Message error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;

