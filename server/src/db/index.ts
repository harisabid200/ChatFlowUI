import initSqlJs, { Database } from 'sql.js';
import { config } from '../config.js';
import { dirname } from 'path';
import { mkdirSync, existsSync, readFileSync, writeFileSync } from 'fs';
import { writeFile } from 'fs/promises';

let db: Database | null = null;
let _autoSaveTimer: ReturnType<typeof setTimeout> | null = null;
let _pendingSave = false;

const dbDir = dirname(config.databasePath);
if (!existsSync(dbDir)) {
  mkdirSync(dbDir, { recursive: true });
}

export async function initializeDatabase(): Promise<Database> {
  if (db) return db;

  const SQL = await initSqlJs();

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

  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      must_change_password INTEGER DEFAULT 1,
      token_version INTEGER DEFAULT 1,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS themes (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      is_preset INTEGER DEFAULT 0,
      config TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

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

    CREATE INDEX IF NOT EXISTS idx_chatbots_theme ON chatbots(theme_id);
  `);

  // Migration: add token_version column for existing databases
  try {
    const columns = db.exec('PRAGMA table_info(users)');
    const hasTokenVersion = columns.length > 0 && columns[0].values.some((col) => col[1] === 'token_version');
    if (!hasTokenVersion) {
      console.log('🔄 Migrating users table: adding token_version column...');
      db.run('ALTER TABLE users ADD COLUMN token_version INTEGER DEFAULT 1');
      console.log('✅ Migration complete');
    }
    // Backfill any NULL token_version rows (ALTER TABLE DEFAULT does not update
    // existing rows in SQLite — they stay NULL, breaking auth version checks).
    db.run('UPDATE users SET token_version = 1 WHERE token_version IS NULL');
  } catch (e) {
    console.error('Migration error:', e);
  }

  // Re-arm after each save completes so writes never overlap
  async function scheduleAutoSave() {
    await saveDatabase();
    _autoSaveTimer = setTimeout(scheduleAutoSave, 30000);
  }
  scheduleAutoSave();

  return db;
}

export function getDb(): Database {
  if (!db) {
    throw new Error('Database not initialized. Call initializeDatabase() first.');
  }
  return db;
}

let _saveQueued = false;

export async function saveDatabase(): Promise<void> {
  if (!db) return;
  if (_pendingSave) {
    // A save is already exporting/writing. Don't drop this request — queue
    // exactly one follow-up save so writes that landed after the in-flight
    // export started still reach disk (previously they were silently lost
    // until the next 30s auto-save, or forever on a crash).
    _saveQueued = true;
    return;
  }
  _pendingSave = true;
  try {
    const data = db.export();
    await writeFile(config.databasePath, Buffer.from(data));
  } catch (error) {
    console.error('Failed to save database:', error);
  } finally {
    _pendingSave = false;
    if (_saveQueued) {
      _saveQueued = false;
      void saveDatabase();
    }
  }
}

export function getAutoSaveInterval(): ReturnType<typeof setTimeout> | null {
  return _autoSaveTimer;
}

// Synchronous fallback on process exit — async saveDatabase cannot be awaited here
process.on('exit', () => {
  if (!db) return;
  try {
    writeFileSync(config.databasePath, Buffer.from(db.export()));
  } catch { /* best-effort */ }
});
