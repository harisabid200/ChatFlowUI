import { Router, Request, Response } from 'express';
import rateLimit from 'express-rate-limit';
import crypto from 'crypto';
import { getDb } from '../db/index.js';
import { getOne } from '../db/helpers.js';
import { getSocketService } from '../services/websocket.js';

const webhookLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 60,
    message: { error: 'Too many requests' },
    standardHeaders: true,
    legacyHeaders: false,
});

const router = Router();
router.use(webhookLimiter);

interface ChatbotRow {
    id: string;
    webhook_secret: string | null;
}

// Receive response from n8n webhook
router.post('/:chatbotId/response', async (req: Request, res: Response) => {
    try {
        const db = getDb();
        const chatbotResult = db.exec(`
      SELECT id, webhook_secret FROM chatbots WHERE id = ?
    `, [req.params.chatbotId]);
        const chatbot = getOne<ChatbotRow>(chatbotResult);

        if (!chatbot) {
            res.status(404).json({ error: 'Chatbot not found' });
            return;
        }

        // Verify signature if secret is configured
        if (chatbot.webhook_secret) {
            const signature = req.headers['x-chatflowui-signature'] as string;
            if (!signature) {
                res.status(401).json({ error: 'Missing signature' });
                return;
            }
            const expectedSignature = crypto
                .createHmac('sha256', chatbot.webhook_secret)
                .update(JSON.stringify(req.body))
                .digest('hex');

            // Timing-safe comparison to prevent timing attacks
            const sigBuf = Buffer.from(signature, 'utf-8');
            const expBuf = Buffer.from(expectedSignature, 'utf-8');
            if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
                res.status(401).json({ error: 'Invalid signature' });
                return;
            }
        }

        const body = req.body;

        // Extract sessionId - support flat or nested formats
        const sessionId = body.sessionId || body.session_id;
        if (!sessionId) {
            res.status(400).json({ error: 'sessionId is required' });
            return;
        }

        // Extract message flexibly from various n8n response shapes
        const message = body.message || body.text || body.output || body.response || '';
        const quickReplies = body.quickReplies || body.quick_replies || [];
        const metadata = body.metadata || {};

        // Emit to WebSocket clients
        const socketService = getSocketService();
        if (socketService) {
            socketService.sendToSession(req.params.chatbotId, sessionId, {
                type: 'bot_message',
                message: typeof message === 'string' ? message : JSON.stringify(message),
                quickReplies: Array.isArray(quickReplies) ? quickReplies : [],
                metadata,
                timestamp: new Date().toISOString(),
            });
        }

        res.json({ success: true });
    } catch (error) {
        console.error('Webhook response error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
