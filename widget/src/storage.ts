import { ConversationData, ChatMessage } from './types';

const STORAGE_PREFIX = 'chatflowui_';

export class StorageManager {
    private chatbotId: string;

    constructor(chatbotId: string) {
        this.chatbotId = chatbotId;
    }

    private getKey(suffix: string): string {
        return `${STORAGE_PREFIX}${this.chatbotId}_${suffix}`;
    }

    // Session ID management
    getSessionId(): string {
        const key = this.getKey('session');
        let sessionId = localStorage.getItem(key);

        if (!sessionId) {
            sessionId = this.generateSessionId();
            localStorage.setItem(key, sessionId);
        }

        return sessionId;
    }

    clearSession(): void {
        localStorage.removeItem(this.getKey('session'));
        localStorage.removeItem(this.getKey('conversation'));
    }

    private generateSessionId(): string {
        return 'sess_' + Math.random().toString(36).substring(2, 15) +
            Math.random().toString(36).substring(2, 15);
    }

    // Conversation persistence
    getConversation(): ConversationData {
        const key = this.getKey('conversation');
        const data = localStorage.getItem(key);

        if (data) {
            try {
                return JSON.parse(data);
            } catch {
                // Invalid data, return empty
            }
        }

        return {
            messages: [],
            preChatCompleted: false,
        };
    }

    saveConversation(data: ConversationData): void {
        const key = this.getKey('conversation');
        localStorage.setItem(key, JSON.stringify(data));
    }

    addMessage(message: ChatMessage): void {
        const conversation = this.getConversation();
        conversation.messages.push(message);
        // Cap at 100 messages to prevent localStorage overflow
        if (conversation.messages.length > 100) {
            conversation.messages = conversation.messages.slice(-100);
        }
        this.saveConversation(conversation);
    }

    setPreChatMetadata(metadata: Record<string, string>): void {
        const conversation = this.getConversation();
        conversation.metadata = metadata;
        conversation.preChatCompleted = true;
        this.saveConversation(conversation);
    }

    // Widget state
    isWidgetOpen(): boolean {
        return localStorage.getItem(this.getKey('open')) === 'true';
    }

    setWidgetOpen(open: boolean): void {
        localStorage.setItem(this.getKey('open'), String(open));
    }

    // Sound preference
    isSoundMuted(): boolean {
        return localStorage.getItem(this.getKey('muted')) === 'true';
    }

    setSoundMuted(muted: boolean): void {
        localStorage.setItem(this.getKey('muted'), String(muted));
    }
}
