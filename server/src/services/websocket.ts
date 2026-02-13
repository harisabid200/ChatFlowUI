import { Server as SocketIOServer, Socket } from 'socket.io';
import { Server as HttpServer } from 'http';
import { getDb } from '../db/index.js';

interface SocketService {
    sendToSession(chatbotId: string, sessionId: string, data: unknown): void;
}

let socketService: SocketService | null = null;

export function initializeWebSocket(httpServer: HttpServer): SocketService {
    const io = new SocketIOServer(httpServer, {
        cors: {
            origin: '*', // CORS handled at route level per chatbot
            methods: ['GET', 'POST'],
        },
        path: '/socket.io',
    });

    // Track connected sessions
    const sessions = new Map<string, Set<string>>(); // chatbotId:sessionId -> socket IDs

    io.on('connection', (socket: Socket) => {
        console.log('Client connected:', socket.id);

        // Join a chatbot session
        socket.on('join', (data: { chatbotId: string; sessionId: string }) => {
            const { chatbotId, sessionId } = data;
            if (!chatbotId || !sessionId) return;

            // Validate chatbot exists and check allowed origins
            try {
                const db = getDb();
                const result = db.exec('SELECT id, allowed_origins FROM chatbots WHERE id = ?', [chatbotId]);
                if (result.length === 0 || result[0].values.length === 0) {
                    socket.emit('error', { message: 'Invalid chatbot' });
                    return;
                }

                // Check allowed origins
                const row = result[0].values[0];
                const allowedOriginsJson = row[1] as string;
                let allowedOrigins: string[] = [];
                try {
                    allowedOrigins = JSON.parse(allowedOriginsJson);
                } catch {
                    allowedOrigins = [];
                }

                const origin = socket.handshake.headers.origin;
                // If origin is present, validate it
                if (origin) {
                    const isAllowed = allowedOrigins.some(allowed => {
                        // Support wildcard subdomains
                        if (allowed.startsWith('*.')) {
                            const domain = allowed.slice(2);
                            return origin.endsWith(domain) || origin === `https://${domain}` || origin === `http://${domain}`;
                        }
                        return origin === allowed;
                    });

                    // Also allow if it matches the server's own domain (same-origin) or configured ADMIN_ORIGIN
                    // This ensures the Admin UI (Preview/Test) can always connect
                    const adminOrigin = process.env.ADMIN_ORIGIN;
                    const isSelfOrAdmin = origin === adminOrigin ||
                        origin === `http://${process.env.HOST || 'localhost'}:${process.env.PORT || 7861}` ||
                        // In development, allow localhost
                        (process.env.NODE_ENV !== 'production' && (origin.includes('localhost') || origin.includes('127.0.0.1')));

                    if (!isAllowed && !isSelfOrAdmin) {
                        console.log(`🚫 Socket connection rejected: Origin ${origin} not allowed for chatbot ${chatbotId}`);
                        socket.emit('error', { message: 'Origin not allowed' });
                        return;
                    }
                }
            } catch (err) {
                console.error('Socket join error:', err);
                return;
            }

            const roomKey = `${chatbotId}:${sessionId}`;
            socket.join(roomKey);

            // Track the session
            if (!sessions.has(roomKey)) {
                sessions.set(roomKey, new Set());
            }
            sessions.get(roomKey)!.add(socket.id);

            console.log(`Socket ${socket.id} joined room ${roomKey}`);
        });

        // Leave a chatbot session
        socket.on('leave', (data: { chatbotId: string; sessionId: string }) => {
            const { chatbotId, sessionId } = data;
            const roomKey = `${chatbotId}:${sessionId}`;

            socket.leave(roomKey);

            const roomSockets = sessions.get(roomKey);
            if (roomSockets) {
                roomSockets.delete(socket.id);
                if (roomSockets.size === 0) {
                    sessions.delete(roomKey);
                }
            }
        });

        // Handle typing indicator
        socket.on('typing', (data: { chatbotId: string; sessionId: string; isTyping: boolean }) => {
            const { chatbotId, sessionId, isTyping } = data;
            const roomKey = `${chatbotId}:${sessionId}`;

            // Broadcast typing status to the room (for multi-tab support)
            socket.to(roomKey).emit('user_typing', { isTyping });
        });

        socket.on('disconnect', () => {
            console.log('Client disconnected:', socket.id);

            // Clean up from all sessions
            sessions.forEach((sockets, roomKey) => {
                if (sockets.has(socket.id)) {
                    sockets.delete(socket.id);
                    if (sockets.size === 0) {
                        sessions.delete(roomKey);
                    }
                }
            });
        });
    });

    socketService = {
        sendToSession(chatbotId: string, sessionId: string, data: unknown) {
            const roomKey = `${chatbotId}:${sessionId}`;
            io.to(roomKey).emit('message', data);
        },
    };

    return socketService;
}

export function getSocketService(): SocketService | null {
    return socketService;
}
