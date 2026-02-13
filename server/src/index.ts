import express from 'express';
import { createServer } from 'http';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import compression from 'compression';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

import { config, isFirstRun } from './config.js';
import { initializeDatabase, getDb, saveDatabase } from './db/index.js';
import { seedPresetThemes } from './db/themes.js';
import { initializeWebSocket } from './services/websocket.js';
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

    // Seed admin user if first run
    await seedAdminUser();

    // Create Express app
    const app = express();
    httpServer = createServer(app);

    // Initialize WebSocket
    initializeWebSocket(httpServer);
    console.log('✅ WebSocket server initialized');

    // Security middleware - Helmet with enhanced CSP
    app.use(helmet({
        contentSecurityPolicy: config.nodeEnv === 'production' ? {
            directives: {
                defaultSrc: ["'self'"],
                scriptSrc: ["'self'", "'unsafe-inline'"], // unsafe-inline needed for widget
                styleSrc: ["'self'", "'unsafe-inline'"],
                imgSrc: ["'self'", "data:", "https:"],
                fontSrc: ["'self'", "data:"],
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

    // Parse JSON and cookies
    // Body parsing with increased limit for base64 images
    app.use(express.json({ limit: '2mb' }));
    app.use(express.urlencoded({ extended: true, limit: '2mb' }));
    app.use(cookieParser());

    // Health check endpoint (no auth)
    app.get('/health', (_req, res) => {
        res.json({ status: 'ok' });
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
    app.use(express.static(adminPath));

    // Serve widget bundle (with CORS for cross-origin embedding)
    const widgetPath = resolve(__dirname, '../../widget/dist');
    app.use('/widget', (req, res, next) => {
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET');
        res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
        // Cache widget assets aggressively (1 year, immutable)
        // Vite content-hashes output files, so cache-busting is automatic on new builds
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        next();
    }, express.static(widgetPath));

    // SPA fallback for admin
    app.get('*', (_req, res) => {
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
    const bcryptModule = await import('bcryptjs');
    const bcrypt = bcryptModule.default || bcryptModule;
    const db = getDb();

    // Check if admin user exists
    const result = db.exec(`SELECT id FROM users WHERE username = ?`, [config.adminUsername]);
    const existingUser = result.length > 0 && result[0].values.length > 0;

    if (!existingUser) {
        const passwordHash = await bcrypt.hash(config.adminPassword, 12);
        db.run(
            `INSERT INTO users (username, password_hash, must_change_password) VALUES (?, ?, 1)`,
            [config.adminUsername, passwordHash]
        );
        saveDatabase();
        console.log('✅ Admin user created');
    }
}

// Start the server
bootstrap().catch((error) => {
    console.error('Failed to start server:', error);
    process.exit(1);
});

// Graceful shutdown handling
function gracefulShutdown(signal: string) {
    console.log(`\n${signal} received. Shutting down gracefully...`);

    if (httpServer) {
        httpServer.close(() => {
            console.log('✅ HTTP server closed');
            saveDatabase();
            console.log('✅ Database saved');
            process.exit(0);
        });

        // Force exit after 10 seconds
        setTimeout(() => {
            console.log('⚠️ Forcing shutdown after timeout');
            saveDatabase();
            process.exit(1);
        }, 10000);
    } else {
        saveDatabase();
        process.exit(0);
    }
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
