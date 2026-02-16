import { Server as SocketIOServer, Socket } from 'socket.io';
import { Server as HttpServer } from 'http';
import { getDb } from '../db/index.js';
import { config } from '../config.js';

interface SocketService {
    sendToSession(chatbotId: string, sessionId: string, data: unknown): void;
}

let socketService: SocketService | null = null;

export function initializeWebSocket(httpServer: HttpServer): SocketService {
    const io = new SocketIOServer(httpServer, {
        cors: {
            origin: (requestOrigin, callback) => {
                // 1. Allow no origin (server-to-server, mobile apps, Postman)
                if (!requestOrigin) {
                    return callback(null, true);
                }

                // 2. Allow Admin Origin
                if (process.env.ADMIN_ORIGIN === requestOrigin) {
                    return callback(null, true);
                }

                // 3. Allow Global Allowed Origins
                if (config.corsAllowedOrigins) {
                    const globalAllowed = config.corsAllowedOrigins.split(',').map(o => o.trim());
                    const normalizedOrigin = requestOrigin.endsWith('/') ? requestOrigin.slice(0, -1) : requestOrigin;
                    const isAllowed = globalAllowed.some(allowed => {
                        const normalizedAllowed = allowed.endsWith('/') ? allowed.slice(0, -1) : allowed;
                        return normalizedOrigin === normalizedAllowed;
                    });
                    if (isAllowed) {
                        return callback(null, true);
                    }
                }

                // 4. Allow Localhost in Development
                if (process.env.NODE_ENV !== 'production') {
                    if (requestOrigin.includes('localhost') || requestOrigin.includes('127.0.0.1')) {
                        return callback(null, true);
                    }
                }

                // 5. Allow Server's Own Origin (Self)
                const host = process.env.HOST || 'localhost';
                const port = process.env.PORT || 7861;
                if (requestOrigin === `http://${host}:${port}` || requestOrigin === `https://${host}:${port}`) {
                    return callback(null, true);
                }

                // 6. Check Database for Chatbot-specific allowed origins
                try {
                    const db = getDb();
                    // Check if ANY chatbot allows this origin
                    const result = db.exec('SELECT allowed_origins FROM chatbots');

                    if (result.length > 0 && result[0].values.length > 0) {
                        const normalizedOrigin = requestOrigin.endsWith('/') ? requestOrigin.slice(0, -1) : requestOrigin;

                        const isAllowedByChatbot = result[0].values.some(row => {
                            try {
                                const allowedOrigins = JSON.parse(row[0] as string) as string[];
                                return allowedOrigins.some(allowed => {
                                    const normalizedAllowed = allowed.endsWith('/') ? allowed.slice(0, -1) : allowed;
                                    if (allowed.startsWith('*.')) {
                                        const domain = allowed.slice(2);
                                        return normalizedOrigin.endsWith(domain) || normalizedOrigin === `https://${domain}` || normalizedOrigin === `http://${domain}`;
                                    }
                                    return normalizedOrigin === normalizedAllowed;
                                });
                            } catch {
                                return false;
                            }
                        });

                        if (isAllowedByChatbot) {
                            return callback(null, true);
                        }
                    }
                } catch (err) {
                    console.error('Error checking WebSocket origin against DB:', err);
                }

                // Reject if no match
                return callback(new Error('Not allowed by CORS'));
            },
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

                    // Check against Global CORS Allowed Origins
                    let isGlobalAllowed = false;
                    if (config.corsAllowedOrigins) {
                        const globalAllowed = config.corsAllowedOrigins.split(',').map(o => o.trim());
                        const normalizedOrigin = origin.endsWith('/') ? origin.slice(0, -1) : origin;
                        isGlobalAllowed = globalAllowed.some(allowed => {
                            const normalizedAllowed = allowed.endsWith('/') ? allowed.slice(0, -1) : allowed;
                            return normalizedOrigin === normalizedAllowed;
                        });
                    }

                    if (!isAllowed && !isSelfOrAdmin && !isGlobalAllowed) {
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
