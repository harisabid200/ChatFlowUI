import { Server as SocketIOServer, Socket } from 'socket.io';
import { Server as HttpServer } from 'http';
import { getCachedChatbot, isOriginAllowedByAnyChatbot } from './chatbot-cache.js';
import { isOriginInList, globalAllowList } from '../utils/origin.js';
import { config } from '../config.js';

interface SocketService {
    sendToSession(chatbotId: string, sessionId: string, data: unknown): void;
}

let socketService: SocketService | null = null;
let sessionSweepInterval: ReturnType<typeof setInterval> | null = null;

export function initializeWebSocket(httpServer: HttpServer): SocketService {
    const io = new SocketIOServer(httpServer, {
        cors: {
            origin: (requestOrigin, callback) => {
                // 1. Allow no origin (server-to-server, mobile apps, Postman)
                // Security posture: non-browser clients (curl, scripts, mobile apps)
                // do not send the Origin header. For the current threat model
                // (single-admin, internally hosted chatbot) this is acceptable.
                // In a multi-tenant / public deployment, add an API key requirement
                // here for no-origin connections to prevent unauthenticated socket use.
                if (!requestOrigin) {
                    return callback(null, true);
                }

                // 2. Allow Admin Origin
                if (config.adminOrigin && config.adminOrigin === requestOrigin) {
                    return callback(null, true);
                }

                if (globalAllowList.length > 0 && isOriginInList(requestOrigin, globalAllowList)) {
                    return callback(null, true);
                }

                // 4. Allow Localhost in Development
                if (config.nodeEnv !== 'production') {
                    if (requestOrigin.includes('localhost') || requestOrigin.includes('127.0.0.1')) {
                        return callback(null, true);
                    }
                }

                // 5. Allow Server's Own Origin (Self)
                if (requestOrigin === `http://${config.host}:${config.port}` || requestOrigin === `https://${config.host}:${config.port}`) {
                    return callback(null, true);
                }

                // 6. Check chatbot-specific allowed origins
                try {
                    const normalizedOrigin = requestOrigin.endsWith('/') ? requestOrigin.slice(0, -1) : requestOrigin;
                    if (isOriginAllowedByAnyChatbot(normalizedOrigin)) {
                        return callback(null, true);
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
    const sessions = new Map<string, Set<string>>();

    // Periodic cleanup of empty session entries (every 5 minutes)
    sessionSweepInterval = setInterval(() => {
        sessions.forEach((sockets, key) => {
            if (sockets.size === 0) sessions.delete(key);
        });
    }, 5 * 60 * 1000);

    io.on('connection', (socket: Socket) => {
        console.log('Client connected:', socket.id);

        // Join a chatbot session
        socket.on('join', (data: { chatbotId: string; sessionId: string }) => {
            const { chatbotId, sessionId } = data;
            if (!chatbotId || !sessionId) return;

            // Validate chatbot exists and check allowed origins
            try {
                const chatbotData = getCachedChatbot(chatbotId);
                if (!chatbotData) {
                    socket.emit('error', { message: 'Invalid chatbot' });
                    return;
                }

                const origin = socket.handshake.headers.origin;
                if (origin) {
                    let allowedOrigins: string[] = [];
                    try {
                        allowedOrigins = JSON.parse(chatbotData.allowed_origins);
                    } catch {
                        allowedOrigins = [];
                    }

                    const isAllowed = isOriginInList(origin, allowedOrigins);

                    // Also allow if it matches the server's own domain (same-origin) or configured ADMIN_ORIGIN
                    // This ensures the Admin UI (Preview/Test) can always connect
                    const isSelfOrAdmin = origin === config.adminOrigin ||
                        origin === `http://${config.host}:${config.port}` ||
                        origin === `https://${config.host}:${config.port}` ||
                        // In development, allow localhost
                        (config.nodeEnv !== 'production' && (origin.includes('localhost') || origin.includes('127.0.0.1')));

                    let isGlobalAllowed = false;
                    if (globalAllowList.length > 0) {
                        isGlobalAllowed = isOriginInList(origin, globalAllowList);
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

export function getSessionSweepInterval(): ReturnType<typeof setInterval> | null {
    return sessionSweepInterval;
}
