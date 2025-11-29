// db/migrations.ts
import { db } from "./sqlite";

export async function runMigrations() {
  console.log("🔧 Running database migrations...");

  try {
    // -----------------------------
    // 1. LIBRARIANS TABLE
    // -----------------------------
    db.execSync(`
      CREATE TABLE IF NOT EXISTS librarians (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE,
        pin_salt TEXT,
        pin_hash TEXT,
        role TEXT CHECK(role IN ('admin','librarian')) DEFAULT 'librarian',
        device_id TEXT,
        deleted INTEGER DEFAULT 0,
        created_at TEXT,
        updated_at TEXT
      );
    `);

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

    // -----------------------------
    // 3. SESSIONS TABLE (optional)
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
    try {
      db.execSync(`ALTER TABLE transactions ADD COLUMN borrowed_at TEXT;`);
    } catch {}

    try {
      db.execSync(`ALTER TABLE transactions ADD COLUMN returned_at TEXT;`);
    } catch {}

    // Backfill borrowed_at if empty
    db.execSync(`
      UPDATE transactions
      SET borrowed_at = timestamp
      WHERE borrowed_at IS NULL AND type = 'borrow';
    `);

    db.execSync(`
      UPDATE transactions
      SET returned_at = timestamp
      WHERE returned_at IS NULL AND type = 'return';
    `);

    // -----------------------------
    // 5. USERS TABLE MIGRATIONS
    // -----------------------------
    try {
      db.execSync(`ALTER TABLE users ADD COLUMN gender TEXT;`);
    } catch {}

    try {
      db.execSync(`ALTER TABLE users ADD COLUMN address TEXT;`);
    } catch {}

    console.log("✅ Database migrations finished.");
  } catch (err) {
    console.log("❌ Migration Error:", err);
  }
}
