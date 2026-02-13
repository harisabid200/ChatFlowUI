
import { getDb, initializeDatabase, saveDatabase } from '../db/index.js';
import { config } from '../config.js';
import bcrypt from 'bcryptjs';

async function verifyAndReset() {
    await initializeDatabase();
    const db = getDb();

    const username = config.adminUsername;
    const password = config.adminPassword; // From .credentials.json or env

    console.log('[DEBUG] Checking admin user:', username);
    console.log('[DEBUG] Config password:', password);

    const result = db.exec('SELECT * FROM users WHERE username = ?', [username]);

    // Check if user exists
    if (!result || result.length === 0 || !result[0].values || result[0].values.length === 0) {
        console.log('[ERROR] Admin user NOT found in DB!');

        // Re-create user if missing
        console.log('[INFO] Re-creating admin user...');
        const passwordHash = await bcrypt.hash(password, 12);

        // Ensure table exists (init DB does this, but safe to check)
        db.run(
            `INSERT INTO users (username, password_hash, must_change_password) VALUES (?, ?, 1)`,
            [username, passwordHash]
        );
        saveDatabase();
        console.log('[SUCCESS] Admin user created with current password!');
        return;
    }

    const usageRow = result[0];
    const columns = usageRow.columns;
    const values = usageRow.values[0];

    // Find column index for password_hash
    const hashIdx = columns.indexOf('password_hash');
    const dbHash = values[hashIdx] as string;

    console.log('[DEBUG] DB Hash exists, length:', dbHash.length);

    const valid = await bcrypt.compare(password, dbHash);

    if (valid) {
        console.log('\n[SUCCESS] Password in .credentials.json MATCHES the DB hash!');
        console.log('Login SHOULD work with password:', password);
        console.log('If login still fails, check cookie/CORS settings.');
    } else {
        console.log('\n[ERROR] Password in .credentials.json DOES NOT MATCH DB hash!');
        console.log('Resetting DB password to match .credentials.json...');

        const newHash = await bcrypt.hash(password, 12);
        db.run('UPDATE users SET password_hash = ? WHERE username = ?', [newHash, username]);
        saveDatabase();

        console.log('[SUCCESS] Password reset! Try logging in now.');
    }
}

verifyAndReset().catch(console.error);
