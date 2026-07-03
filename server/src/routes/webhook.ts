import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { getCachedChatbot } from '../services/chatbot-cache.js';
import { getSocketService } from '../services/websocket.js';
import { webhookLimiter } from '../middleware/rateLimit.js';

const router = Router();

// Receive response from n8n webhook.
// webhookLimiter is attached at the route level (NOT via router.use) so the
// :chatbotId path param is parsed and available to its keyGenerator. Limiting
// per-chatbotId prevents one busy customer's n8n traffic — which all comes
// from a single n8n host IP — from starving other customers.
router.post('/:chatbotId/response', webhookLimiter, async (req: Request, res: Response) => {
    try {
        const chatbot = getCachedChatbot(req.params.chatbotId);

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
            // Validate format before comparison — must be exactly 64 hex chars (sha256 hex digest)
            if (!/^[0-9a-f]{64}$/i.test(signature)) {
                res.status(401).json({ error: 'Invalid signature' });
                return;
            }
            // HMAC must be computed over the raw request bytes — re-stringifying
            // the parsed body can reorder keys / re-escape characters and break
            // signature verification. `req.rawBody` is captured by the
            // express.json `verify` callback registered on /webhook in
            // src/index.ts. Fall back to JSON.stringify only if a future caller
            // bypasses that hook.
            const bodyForHmac = req.rawBody ?? Buffer.from(JSON.stringify(req.body));
            const expectedSignature = crypto
                .createHmac('sha256', chatbot.webhook_secret)
                .update(bodyForHmac)
                .digest('hex');

            // Compare decoded hex bytes — both buffers are 32 bytes (256-bit HMAC)
            const sigBuf = Buffer.from(signature, 'hex');
            const expBuf = Buffer.from(expectedSignature, 'hex');
            if (!crypto.timingSafeEqual(sigBuf, expBuf)) {
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
        const rawMessage = body.message || body.text || body.output || body.response || '';
        // Cap length — the body limit is 64 KB but a single message field could be large.
        // Keeping messages ≤ 8192 chars prevents oversized socket payloads.
        const MAX_MSG = 8192;
        const message = typeof rawMessage === 'string' && rawMessage.length > MAX_MSG
            ? rawMessage.slice(0, MAX_MSG) + '…'
            : rawMessage;
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
