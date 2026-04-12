import { Router, Request, Response } from 'express';
import { dynamicCorsMiddleware } from '../middleware/cors.js';
import { widgetLimiter } from '../middleware/rateLimit.js';
import { ThemeConfig } from '../types/index.js';
import { forwardToWebhook } from '../services/webhook-forwarder.js';
import { getCachedChatbot } from '../services/chatbot-cache.js';
import { getCachedThemeConfig } from '../services/theme-cache.js';

const MAX_CSS_LENGTH = 8192;

// Decode CSS hex escapes (e.g. \61 → 'a') before pattern matching to prevent
// bypass attempts like j\61vascript:
function decodeCssEscapes(css: string): string {
    return css.replace(/\\([0-9a-fA-F]{1,6})\s?/g, (_, hex) => {
        const cp = parseInt(hex, 16);
        if (cp === 0 || cp > 0x10ffff) return '';
        return String.fromCodePoint(cp);
    });
}

function sanitizeCss(css: string): string {
    if (css.length > MAX_CSS_LENGTH) {
        return '/* Custom CSS disabled: exceeds 8192-character limit */';
    }

    const decoded = decodeCssEscapes(css);

    return decoded
        .replace(/url\s*\([^)]{0,2000}\)/gi, '/* url removed */')
        .replace(/@import\s+[^;]{0,500};?/gi, '/* import removed */')
        .replace(/@charset\s+[^;]{0,100};?/gi, '/* charset removed */')
        .replace(/@namespace\s+[^;]{0,100};?/gi, '/* namespace removed */')
        .replace(/expression\s*\([^)]{0,500}\)/gi, '/* expression removed */')
        .replace(/javascript\s*:/gi, '/* removed */')
        .replace(/behavior\s*:/gi, '/* removed */')
        .replace(/-moz-binding\s*:/gi, '/* removed */')
        .replace(/-webkit-mask(?:-image)?\s*:[^;]{0,500}/gi, '/* removed */');
}

const router = Router();

router.options('/:chatbotId/*', dynamicCorsMiddleware);

router.get('/:chatbotId/config', dynamicCorsMiddleware, (req: Request, res: Response) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    const chatbot = getCachedChatbot(req.params.chatbotId);

    if (!chatbot) {
        res.status(404).json({ error: 'Chatbot not found' });
        return;
    }

    const theme: ThemeConfig | null = chatbot.theme_id
        ? getCachedThemeConfig(chatbot.theme_id) ?? getCachedThemeConfig('default')
        : getCachedThemeConfig('default');

    const settings = { ...chatbot.parsed_settings };
    if (chatbot.launcher_logo) settings.launcherLogo = chatbot.launcher_logo;
    if (chatbot.header_logo) settings.headerLogo = chatbot.header_logo;

    res.json({
        chatbotId: chatbot.id,
        name: chatbot.name,
        theme,
        customCss: chatbot.custom_css ? sanitizeCss(chatbot.custom_css) : null,
        preChatForm: chatbot.parsed_pre_chat_form ?? null,
        settings,
    });
});

router.post('/:chatbotId/message', dynamicCorsMiddleware, widgetLimiter, async (req: Request, res: Response) => {
    try {
        const { sessionId, message, metadata } = req.body;

        if (!sessionId || !message) {
            res.status(400).json({ error: 'sessionId and message are required' });
            return;
        }

        if (typeof sessionId !== 'string' || sessionId.length > 256) {
            res.status(400).json({ error: 'sessionId must be a string of at most 256 characters' });
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

        res.json({ success: true, response: result.response });
    } catch (error) {
        console.error('Message error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
