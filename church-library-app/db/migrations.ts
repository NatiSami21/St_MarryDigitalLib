// db/migrations.ts
import { db } from "./sqlite";

export async function runMigrations() {
  console.log("🔧 Running database migrations...");

  try {
    // -----------------------------
    // 1. LIBRARIANS TABLE (CREATE IF NOT EXISTS)
    // -----------------------------
    db.execSync(`
      CREATE TABLE IF NOT EXISTS librarians (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE,
        full_name TEXT,
        pin_salt TEXT,
        pin_hash TEXT,
        role TEXT CHECK(role IN ('admin','librarian')) DEFAULT 'librarian',
        device_id TEXT,
        deleted INTEGER DEFAULT 0,
        created_at TEXT,
        updated_at TEXT
      );
    `);

    // ONE-TIME SAFE COLUMN ADDITIONS
    try { db.execSync(`ALTER TABLE librarians ADD COLUMN full_name TEXT;`); } catch {}
    try { db.execSync(`ALTER TABLE librarians ADD COLUMN created_at TEXT;`); } catch {}
    try { db.execSync(`ALTER TABLE librarians ADD COLUMN updated_at TEXT;`); } catch {}
    try { db.execSync(`ALTER TABLE librarians ADD COLUMN device_id TEXT;`); } catch {}
    try { db.execSync(`ALTER TABLE librarians ADD COLUMN deleted INTEGER DEFAULT 0;`); } catch {}

    // -----------------------------
    // 2. COMMITS TABLE
    // -----------------------------
    db.execSync(`
      CREATE TABLE IF NOT EXISTS commits (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        commit_id TEXT UNIQUE,
        librarian_username TEXT,
        device_id TEXT,
        type TEXT,
        payload TEXT,
        timestamp TEXT,
        pushed INTEGER DEFAULT 0
      );
    `);

    // NEVER alter timestamp again!

    // -----------------------------
    // 3. SESSIONS TABLE
    // -----------------------------
    db.execSync(`
      CREATE TABLE IF NOT EXISTS sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        librarian_username TEXT,
        device_id TEXT,
        token TEXT,
        created_at TEXT
      );
    `);

    // -----------------------------
    // 4. TRANSACTIONS MIGRATIONS
    // -----------------------------
    // 4. TRANSACTIONS MIGRATIONS (final)
    try {
      db.execSync(`ALTER TABLE transactions ADD COLUMN borrowed_at TEXT;`);
    } catch {}

    try {
      db.execSync(`ALTER TABLE transactions ADD COLUMN returned_at TEXT;`);
    } catch {}

    // No backfill needed — new schema controls values

    // -----------------------------
    // 5. USERS TABLE MIGRATIONS
    // -----------------------------
    try { db.execSync(`ALTER TABLE users ADD COLUMN gender TEXT;`); } catch {}
    try { db.execSync(`ALTER TABLE users ADD COLUMN address TEXT;`); } catch {}

    console.log("✅ Database migrations finished.");
  } catch (err) {
    console.log("❌ Migration Error:", err);
  }
}
