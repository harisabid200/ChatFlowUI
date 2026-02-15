import { io, Socket } from 'socket.io-client';

interface MessageHandler {
    (data: {
        type: string;
        message: string;
        quickReplies?: string[];
        metadata?: Record<string, unknown>;
        timestamp: string;
    }): void;
}

interface TypingHandler {
    (data: { isTyping: boolean }): void;
}

export class SocketClient {
    private socket: Socket | null = null;
    private baseUrl: string;
    private chatbotId: string;
    private sessionId: string;
    private onMessage: MessageHandler | null = null;
    private onTyping: TypingHandler | null = null;
    private reconnectAttempts = 0;
    private maxReconnectAttempts = 5;

    constructor(baseUrl: string, chatbotId: string, sessionId: string) {
        this.baseUrl = baseUrl;
        this.chatbotId = chatbotId;
        this.sessionId = sessionId;
    }

    connect(): void {
        if (this.socket?.connected) return;

        // Parse the base URL to correctly handle subpaths (e.g. /7861/)
        // If baseUrl is "https://domain.com/7861", we want the socket path to be "/7861/socket.io"
        // NOT "/socket.io" (default) which would go to root
        let socketPath = '/socket.io';
        let connectionUrl = this.baseUrl;

        try {
            const url = new URL(this.baseUrl);
            const path = url.pathname.replace(/\/$/, ''); // Remove trailing slash
            socketPath = `${path}/socket.io`;
            connectionUrl = url.origin; // Connect to origin, let path handle the routing
        } catch (e) {
            // Fallback to default behavior if URL parsing fails
            console.warn('[ChatFlowUI] Failed to parse baseUrl, using default socket path');
        }

        this.socket = io(connectionUrl, {
            path: socketPath,
            transports: ['websocket', 'polling'],
            reconnection: true,
            reconnectionAttempts: this.maxReconnectAttempts,
            reconnectionDelay: 1000,
        });

        this.socket.on('connect', () => {
            this.reconnectAttempts = 0;

            // Join the session room
            this.socket?.emit('join', {
                chatbotId: this.chatbotId,
                sessionId: this.sessionId,
            });
        });

        this.socket.on('disconnect', () => {
            // Silently handle disconnection
        });

        this.socket.on('message', (data) => {
            if (this.onMessage) {
                this.onMessage(data);
            }
        });

        this.socket.on('user_typing', (data) => {
            if (this.onTyping) {
                this.onTyping(data);
            }
        });

        this.socket.on('connect_error', (error) => {
            console.error('[ChatFlowUI] Connection error:', error.message);
            this.reconnectAttempts++;
        });
    }

    disconnect(): void {
        if (this.socket) {
            this.socket.emit('leave', {
                chatbotId: this.chatbotId,
                sessionId: this.sessionId,
            });
            this.socket.disconnect();
            this.socket = null;
        }
    }

    setMessageHandler(handler: MessageHandler): void {
        this.onMessage = handler;
    }

    setTypingHandler(handler: TypingHandler): void {
        this.onTyping = handler;
    }

    sendTypingStatus(isTyping: boolean): void {
        if (this.socket?.connected) {
            this.socket.emit('typing', {
                chatbotId: this.chatbotId,
                sessionId: this.sessionId,
                isTyping,
            });
        }
    }

    isConnected(): boolean {
        return this.socket?.connected ?? false;
    }
}
