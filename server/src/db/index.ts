import initSqlJs, { Database } from 'sql.js';
import { config } from '../config.js';
import { dirname } from 'path';
import { mkdirSync, existsSync, readFileSync, writeFileSync } from 'fs';

let db: Database | null = null;

// Ensure database directory exists
const dbDir = dirname(config.databasePath);
if (!existsSync(dbDir)) {
  mkdirSync(dbDir, { recursive: true });
}

// Initialize sql.js and load/create database
export async function initializeDatabase(): Promise<Database> {
  const SQL = await initSqlJs();

  // Try to load existing database
  try {
    if (existsSync(config.databasePath)) {
      const fileBuffer = readFileSync(config.databasePath);
      db = new SQL.Database(fileBuffer);
    } else {
      db = new SQL.Database();
    }
  } catch {
    db = new SQL.Database();
  }

  // Create schema
  db.run(`
    -- Users table
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      must_change_password INTEGER DEFAULT 1,
      token_version INTEGER DEFAULT 1,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    -- Themes table
    CREATE TABLE IF NOT EXISTS themes (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      is_preset INTEGER DEFAULT 0,
      config TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    -- Chatbots table
    CREATE TABLE IF NOT EXISTS chatbots (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      webhook_url TEXT NOT NULL,
      webhook_secret TEXT,
      allowed_origins TEXT NOT NULL,
      theme_id TEXT,
      custom_css TEXT,
      pre_chat_form TEXT,
      settings TEXT NOT NULL,
      launcher_logo TEXT,
      header_logo TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (theme_id) REFERENCES themes(id)
    );

    -- Create indexes
    CREATE INDEX IF NOT EXISTS idx_chatbots_theme ON chatbots(theme_id);
  `);

  // Migration: Add token_version if missing
  try {
    const columns = db.exec("PRAGMA table_info(users)");
    const hasTokenVersion = columns.length > 0 && columns[0].values.some((col) => col[1] === 'token_version');

    if (!hasTokenVersion) {
      console.log('🔄 Migrating users table: adding token_version column...');
      db.run("ALTER TABLE users ADD COLUMN token_version INTEGER DEFAULT 1");
      console.log('✅ Migration complete: added token_version');
    }
  } catch (e) {
    console.error('Migration error:', e);
  }

  // Save initial database
  saveDatabase();

  return db;
}

// Get database instance (throws if not initialized)
export function getDb(): Database {
  if (!db) {
    throw new Error('Database not initialized. Call initializeDatabase() first.');
  }
  return db;
}

// Save database to file
export function saveDatabase(): void {
  if (!db) return;
  try {
    const data = db.export();
    const buffer = Buffer.from(data);
    writeFileSync(config.databasePath, buffer);
  } catch (error) {
    console.error('Failed to save database:', error);
  }
}

// Auto-save every 30 seconds
setInterval(saveDatabase, 30000);

// Save on process exit
process.on('exit', saveDatabase);
