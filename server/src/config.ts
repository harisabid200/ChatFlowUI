import { z } from 'zod';
import { config as loadEnv } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { existsSync, mkdirSync, writeFileSync, readFileSync } from 'fs';
import crypto from 'crypto';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(__dirname, '..');

// Load .env file
loadEnv({ path: resolve(rootDir, '..', '.env') });

// Path for storing auto-generated credentials
const dataDir = resolve(rootDir, '..', 'data');
const credentialsPath = resolve(dataDir, '.credentials.json');

// Ensure data directory exists
if (!existsSync(dataDir)) {
    mkdirSync(dataDir, { recursive: true });
}

// Check if this is first run (no credentials file)
let isFirstRun = false;
let storedCredentials: { adminPassword?: string; jwtSecret?: string } = {};

if (existsSync(credentialsPath)) {
    try {
        storedCredentials = JSON.parse(readFileSync(credentialsPath, 'utf-8'));
    } catch {
        // Invalid file, will regenerate
    }
}

// Generate credentials if not exists
function generatePassword(length = 12): string {
    // Using only alphanumeric to avoid terminal copy-paste issues
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    const randomBytes = crypto.randomBytes(length);
    let password = '';
    for (let i = 0; i < length; i++) {
        password += chars.charAt(randomBytes[i] % chars.length);
    }
    return password;
}

// Auto-generate credentials on first run
if (!process.env.JWT_SECRET && !storedCredentials.jwtSecret) {
    storedCredentials.jwtSecret = crypto.randomBytes(32).toString('hex');
    isFirstRun = true;
}

if (!process.env.ADMIN_PASSWORD && !storedCredentials.adminPassword) {
    storedCredentials.adminPassword = generatePassword(12);
    isFirstRun = true;
}

// Save credentials if newly generated
if (isFirstRun) {
    writeFileSync(credentialsPath, JSON.stringify(storedCredentials, null, 2));
    console.log('\n' + '='.repeat(60));
    console.log('🔑 FIRST RUN - AUTO-GENERATED CREDENTIALS');
    console.log('='.repeat(60));
    console.log(`   Username: ${process.env.ADMIN_USERNAME || 'admin'}`);
    console.log(`   Password: ${storedCredentials.adminPassword}`);
    console.log('='.repeat(60));
    console.log('⚠️  Save these credentials! They are stored in:');
    console.log(`   ${credentialsPath}`);
    console.log('='.repeat(60) + '\n');
}

// Configuration schema with validation
const configSchema = z.object({
    port: z.number().default(7861),
    host: z.string().default('0.0.0.0'),
    nodeEnv: z.enum(['development', 'production', 'test']).default('development'),
    jwtSecret: z.string().min(32),
    adminUsername: z.string().default('admin'),
    adminPassword: z.string().min(6),
    databasePath: z.string().default(resolve(dataDir, 'chatflowui.db')),
    rateLimitWindowMs: z.number().default(60000),
    rateLimitMax: z.number().default(100),
    basePath: z.string().default('/'),
    corsAllowedOrigins: z.string().optional(),
});

export type Config = z.infer<typeof configSchema>;

// Build and validate configuration
export const config: Config = configSchema.parse({
    port: parseInt(process.env.PORT || '7861', 10),
    host: process.env.HOST || '0.0.0.0',
    nodeEnv: process.env.NODE_ENV || 'development',
    jwtSecret: process.env.JWT_SECRET || storedCredentials.jwtSecret,
    adminUsername: process.env.ADMIN_USERNAME || 'admin',
    adminPassword: process.env.ADMIN_PASSWORD || storedCredentials.adminPassword,
    databasePath: process.env.DATABASE_PATH || resolve(dataDir, 'chatflowui.db'),
    rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10),
    rateLimitMax: parseInt(process.env.RATE_LIMIT_MAX || '100', 10),
    basePath: process.env.BASE_PATH || '/',
    corsAllowedOrigins: process.env.CORS_ALLOWED_ORIGINS,
});

export { isFirstRun };
