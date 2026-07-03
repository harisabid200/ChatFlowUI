import express from 'express';
import { createServer } from 'http';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import compression from 'compression';
import bcrypt from 'bcryptjs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

import { config, isFirstRun } from './config.js';
import { initializeDatabase, getDb, saveDatabase, getAutoSaveInterval } from './db/index.js';
import { seedPresetThemes } from './db/themes.js';
import { initializeWebSocket, getSessionSweepInterval } from './services/websocket.js';
import { rebuildOriginIndex } from './services/chatbot-cache.js';
import { dynamicCorsMiddleware } from './middleware/cors.js';
import { apiLimiter } from './middleware/rateLimit.js';

// Routes
import authRoutes from './routes/auth.js';
import chatbotRoutes from './routes/chatbots.js';
import themeRoutes from './routes/themes.js';
import widgetRoutes from './routes/widget.js';
import webhookRoutes from './routes/webhook.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Store server reference for graceful shutdown
let httpServer: ReturnType<typeof createServer> | null = null;

async function bootstrap() {
    console.log('🚀 Starting ChatFlowUI...');

    // Initialize database
    await initializeDatabase();
    console.log('✅ Database initialized');

    // Seed preset themes
    seedPresetThemes();
    console.log('✅ Preset themes loaded');

    // Build the origin lookup index once. Chatbot CUD operations rebuild it
    // via invalidateChatbotCache() so the WS handshake stays O(1).
    rebuildOriginIndex();

    // Seed admin user if first run
    await seedAdminUser();

    // Create Express app
    const app = express();
    httpServer = createServer(app);

    // trust proxy is required when running behind a reverse proxy (like Nginx)
    // to correctly identify the client IP address from X-Forwarded-For header
    // Use 'loopback' to trust only local proxy, or 1 for first hop
    app.set('trust proxy', 1);

    // Initialize WebSocket
    initializeWebSocket(httpServer);
    console.log('✅ WebSocket server initialized');

    // Security middleware - Helmet with enhanced CSP
    app.use(helmet({
        contentSecurityPolicy: config.nodeEnv === 'production' ? {
            directives: {
                defaultSrc: ["'self'"],
                scriptSrc: ["'self'", "'unsafe-inline'", "'strict-dynamic'"], // unsafe-inline ignored by CSP3+ browsers when strict-dynamic present
                styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
                imgSrc: ["'self'", "data:", "https:"],
                fontSrc: ["'self'", "data:", "https://fonts.gstatic.com"],
                connectSrc: ["'self'", "wss:", "ws:"], // WebSocket support
                frameSrc: ["'none'"],
                objectSrc: ["'none'"],
                upgradeInsecureRequests: [],
            },
        } : false,
        crossOriginEmbedderPolicy: false, // Required for widget embedding
        hsts: {
            maxAge: 31536000, // 1 year
            includeSubDomains: true,
            preload: true,
        },
    }));

    // Compression middleware - smaller responses
    app.use(compression());

    // Prevent caching of API responses (security best practice)
    app.use(['/api', '/widget/:chatbotId/message', '/webhook'], (_req, res, next) => {
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
        next();
    });

    // Body parsing — limits scoped per route group for defence-in-depth
    // Admin API allows 2mb for base64 image uploads (logos)
    app.use('/api', express.json({ limit: '2mb' }));
    app.use('/api', express.urlencoded({ extended: true, limit: '2mb' }));
    // Widget messages are text-only — 16kb is generous
    app.use('/widget', express.json({ limit: '16kb' }));
    // n8n webhook response payloads — 64kb covers any realistic response.
    // The `verify` callback stashes the raw body bytes on the request so HMAC
    // verification in routes/webhook.ts can hash exactly what n8n signed.
    // Recomputing the hash over JSON.stringify(req.body) is unsafe because key
    // order, escaping, and number formatting are not guaranteed to match.
    app.use('/webhook', express.json({
        limit: '64kb',
        verify: (req, _res, buf) => {
            (req as express.Request).rawBody = Buffer.from(buf);
        },
    }));
    app.use(cookieParser());

    // Health check endpoint (no auth) — verifies DB is reachable
    app.get('/health', (_req, res) => {
        try {
            getDb().exec('SELECT 1');
            res.json({ status: 'ok', db: 'ok' });
        } catch {
            res.status(503).json({ status: 'error', db: 'unavailable' });
        }
    });

    // API rate limiting
    app.use('/api', apiLimiter);

    // CORS for API routes
    app.use('/api', dynamicCorsMiddleware);

    // API routes
    app.use('/api/auth', authRoutes);
    app.use('/api/chatbots', chatbotRoutes);
    app.use('/api/themes', themeRoutes);

    // Widget routes (public, per-chatbot CORS)
    app.use('/widget', widgetRoutes);

    // Webhook routes (from n8n)
    app.use('/webhook', webhookRoutes);

    // Serve static files for admin dashboard (in production)
    const adminPath = resolve(__dirname, '../../admin/dist');
    // Mount at root (for when proxy strips path)
    app.use(express.static(adminPath));
    // Mount at base path (for when proxy preserves path)
    if (config.basePath !== '/') {
        app.use(config.basePath, express.static(adminPath));
    }

    // Serve widget bundle (with CORS for cross-origin embedding)
    const widgetPath = resolve(__dirname, '../../widget/dist');
    const serveWidget = (req: express.Request, res: express.Response, next: express.NextFunction) => {
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET');
        res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');

        // Disable caching for entry files so updates are immediate
        if (req.url === '/widget.iife.js' || req.url === '/widget.js') {
            res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        } else {
            // Cache other assets aggressivey (1 year, immutable)
            res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        }
        next();
    };

    app.use('/widget', serveWidget, express.static(widgetPath));
    if (config.basePath !== '/') {
        app.use(`${config.basePath}/widget`, serveWidget, express.static(widgetPath));
    }

    // SPA fallback for admin
    app.get('*', (req, res, next) => {
        // Skip API, widget, and webhook routes
        if (req.url.startsWith('/api') || req.url.startsWith('/widget') || req.url.startsWith('/webhook')) {
            return next();
        }
        // If specific base path is set, also check against it
        if (config.basePath !== '/' && (
            req.url.startsWith(`${config.basePath}/api`) ||
            req.url.startsWith(`${config.basePath}/widget`) ||
            req.url.startsWith(`${config.basePath}/webhook`)
        )) {
            return next();
        }

        res.sendFile(resolve(adminPath, 'index.html'));
    });

    // Start server
    httpServer.listen(config.port, config.host, () => {
        console.log('');
        console.log('='.repeat(60));
        console.log(`✅ ChatFlowUI started successfully!`);
        console.log('='.repeat(60));
        const displayHost = config.host === '0.0.0.0' ? '<your-server-ip>' : config.host;
        console.log(`   Admin Dashboard: http://${displayHost}:${config.port}`);
        console.log(`   API: http://${displayHost}:${config.port}/api`);
        console.log('='.repeat(60));

        if (isFirstRun) {
            console.log('');
            console.log('📝 NEXT STEPS:');
            console.log('   1. Login with the credentials shown above');
            console.log('   2. Change your password');
            console.log('   3. Create your first chatbot');
            console.log('');
        }
    });
}

// Seed admin user
async function seedAdminUser() {
    const db = getDb();

    // Check if admin user exists
    const result = db.exec(`SELECT id FROM users WHERE username = ?`, [config.adminUsername]);
    const existingUser = result.length > 0 && result[0].values.length > 0;

    if (!existingUser) {
        console.log(`🔐 Creating admin user with password from config...`);
        console.log(`   Password length: ${config.adminPassword.length} characters`);
        const passwordHash = await bcrypt.hash(config.adminPassword, 12);
        db.run(
            `INSERT INTO users (username, password_hash, must_change_password) VALUES (?, ?, 1)`,
            [config.adminUsername, passwordHash]
        );
        saveDatabase();
        console.log('✅ Admin user created');
    } else {
        console.log('ℹ️  Admin user already exists, skipping creation');
    }
}

// Start the server
bootstrap().catch((error) => {
    console.error('Failed to start server:', error);
    process.exit(1);
});

// Graceful shutdown handling
async function gracefulShutdown(signal: string) {
    console.log(`\n${signal} received. Shutting down gracefully...`);

    // Stop all background intervals before closing connections
    clearInterval(getAutoSaveInterval() ?? undefined);
    clearInterval(getSessionSweepInterval() ?? undefined);

    if (httpServer) {
        httpServer.close(async () => {
            console.log('✅ HTTP server closed');
            await saveDatabase();
            console.log('✅ Database saved');
            process.exit(0);
        });

        // Force exit after 10 seconds
        setTimeout(async () => {
            console.log('⚠️ Forcing shutdown after timeout');
            await saveDatabase();
            process.exit(1);
        }, 10000);
    } else {
        await saveDatabase();
        process.exit(0);
    }
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
