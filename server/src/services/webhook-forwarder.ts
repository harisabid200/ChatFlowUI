import { getDb } from '../db/index.js';
import { getOne } from '../db/helpers.js';

interface ChatbotWebhookInfo {
    webhook_url: string;
    webhook_secret: string | null;
}

interface WebhookResponse {
    message?: string;
    quickReplies?: string[];
}

/**
 * Parse webhook response flexibly - supports:
 * 1. JSON object: {"message": "...", "quickReplies": [...]}
 * 2. JSON array: [{"message": "..."}] (n8n often wraps in array)
 * 3. Plain text: treated as the message content
 * 4. Empty response: null (async flow via WebSocket)
 */
export function parseWebhookResponse(text: string): WebhookResponse | null {
    if (!text || !text.trim()) return null;

    try {
        let parsed = JSON.parse(text);

        // n8n often wraps responses in an array
        if (Array.isArray(parsed)) {
            parsed = parsed[0];
        }

        // If parsed is a string, treat it as message
        if (typeof parsed === 'string') {
            return { message: parsed };
        }

        // If it has an "output" field (common n8n AI agent pattern)
        if (parsed?.output) {
            return { message: parsed.output, quickReplies: parsed.quickReplies };
        }

        // If it has a "text" field
        if (parsed?.text) {
            return { message: parsed.text, quickReplies: parsed.quickReplies };
        }

        // If it has the expected "message" field
        if (parsed?.message) {
            return { message: parsed.message, quickReplies: parsed.quickReplies };
        }

        // If it has a "response" field
        if (parsed?.response) {
            return { message: typeof parsed.response === 'string' ? parsed.response : JSON.stringify(parsed.response) };
        }

        // Unknown JSON structure - stringify it as the message
        return { message: JSON.stringify(parsed) };
    } catch {
        // Not valid JSON - treat entire text as plain message
        return { message: text.trim() };
    }
}

/**
 * Forward a message to a chatbot's webhook URL.
 * Used by both the widget message endpoint and the admin test chat.
 */
export async function forwardToWebhook(
    chatbotId: string,
    sessionId: string,
    message: string,
    metadata?: Record<string, unknown>
): Promise<{ success: boolean; response: WebhookResponse | null; error?: string; statusCode?: number }> {
    const db = getDb();
    const chatbotResult = db.exec(
        `SELECT webhook_url, webhook_secret FROM chatbots WHERE id = ?`,
        [chatbotId]
    );
    const chatbot = getOne<ChatbotWebhookInfo>(chatbotResult);

    if (!chatbot) {
        return { success: false, response: null, error: 'Chatbot not found', statusCode: 404 };
    }

    const payload = {
        chatbotId,
        sessionId,
        message,
        metadata: metadata || {},
        timestamp: new Date().toISOString(),
    };

    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
    };

    // Add signing header if secret is configured
    if (chatbot.webhook_secret) {
        const crypto = await import('crypto');
        const signature = crypto
            .createHmac('sha256', chatbot.webhook_secret)
            .update(JSON.stringify(payload))
            .digest('hex');
        headers['X-ChatFlowUI-Signature'] = signature;
    }

    // Make request with timeout (30 seconds)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    let response;
    try {
        response = await fetch(chatbot.webhook_url, {
            method: 'POST',
            headers,
            body: JSON.stringify(payload),
            signal: controller.signal,
        });
    } catch (fetchError) {
        clearTimeout(timeoutId);
        if ((fetchError as Error).name === 'AbortError') {
            console.error('Webhook timeout:', chatbot.webhook_url);
            return { success: false, response: null, error: 'Request timed out. The AI is taking too long to respond.', statusCode: 504 };
        }
        throw fetchError;
    }

    clearTimeout(timeoutId);

    if (!response.ok) {
        const errorText = await response.text();
        console.error('Webhook error:', response.status, errorText);

        if (response.status === 429) {
            return { success: false, response: null, error: 'Too many requests. Please wait a moment.', statusCode: 429 };
        } else if (response.status >= 500) {
            return { success: false, response: null, error: 'The AI service is temporarily unavailable.', statusCode: 502 };
        } else {
            return { success: false, response: null, error: 'Failed to communicate with backend', statusCode: 502 };
        }
    }

    // Parse response
    const text = await response.text();
    const data = parseWebhookResponse(text);
    return { success: true, response: data };
}
