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
    try { db.execSync(`ALTER TABLE librarians ADD COLUMN require_pin_change INTEGER DEFAULT 0;`); } catch {}

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

    // -----------------------------
    // 6. SHIFT ATTENDANCE MIGRATIONS
    // -----------------------------
    console.log("🔄 Checking shift_attendance table migrations...");
    
    // Create the table if it doesn't exist (with old schema first)
    db.execSync(`
      CREATE TABLE IF NOT EXISTS shift_attendance (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        librarian_username TEXT NOT NULL,
        shift_id INTEGER NOT NULL,
        clock_in INTEGER,
        clock_out INTEGER,
        late_minutes INTEGER DEFAULT 0,
        status TEXT,
        synced INTEGER DEFAULT 0
      );
    `);

    // Add missing columns that exist in Supabase
    try { 
      db.execSync(`ALTER TABLE shift_attendance ADD COLUMN created_at INTEGER;`); 
      console.log("  ✅ Added created_at column");
    } catch (e: any) {
      if (!e.message?.includes('duplicate column name')) {
        console.log("  ℹ️ created_at column already exists or error:", e.message);
      }
    }

    try { 
      db.execSync(`ALTER TABLE shift_attendance ADD COLUMN updated_at INTEGER;`); 
      console.log("  ✅ Added updated_at column");
    } catch (e: any) {
      if (!e.message?.includes('duplicate column name')) {
        console.log("  ℹ️ updated_at column already exists or error:", e.message);
      }
    }

    // Backfill existing records with current timestamp if they're null
    const now = Date.now();
    try {
      db.execSync(`
        UPDATE shift_attendance 
        SET created_at = ${now}, updated_at = ${now}
        WHERE created_at IS NULL OR updated_at IS NULL
      `);
      console.log("  ✅ Backfilled timestamps for existing records");
    } catch (e: any) {
      console.log("  ℹ️ No records to backfill or error:", e.message);
    }

    // Also ensure the table has proper constraints
    try {
      // Add foreign key constraint if not already there
      db.execSync(`
        CREATE INDEX IF NOT EXISTS idx_shift_attendance_shift_id 
        ON shift_attendance(shift_id);
      `);
      
      db.execSync(`
        CREATE INDEX IF NOT EXISTS idx_shift_attendance_username 
        ON shift_attendance(librarian_username);
      `);
      
      console.log("  ✅ Ensured indexes on shift_attendance table");
    } catch (e: any) {
      console.log("  ℹ️ Error creating indexes:", e.message);
    }

    // -----------------------------
    // 7. SHIFTS TABLE MIGRATIONS
    // -----------------------------
    console.log("🔄 Checking shifts table migrations...");
    
    // Create shifts table if it doesn't exist
    db.execSync(`
      CREATE TABLE IF NOT EXISTS shifts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        librarian_username TEXT NOT NULL,
        date TEXT NOT NULL,
        start_time TEXT NOT NULL,
        end_time TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        deleted INTEGER DEFAULT 0
      );
    `);

    // Add missing columns for shifts
    try { 
      db.execSync(`ALTER TABLE shifts ADD COLUMN created_at INTEGER;`); 
      console.log("  ✅ Added created_at column to shifts");
    } catch (e: any) {
      if (!e.message?.includes('duplicate column name')) {
        console.log("  ℹ️ created_at column already exists in shifts or error:", e.message);
      }
    }

    try { 
      db.execSync(`ALTER TABLE shifts ADD COLUMN updated_at INTEGER;`); 
      console.log("  ✅ Added updated_at column to shifts");
    } catch (e: any) {
      if (!e.message?.includes('duplicate column name')) {
        console.log("  ℹ️ updated_at column already exists in shifts or error:", e.message);
      }
    }

    try { 
      db.execSync(`ALTER TABLE shifts ADD COLUMN deleted INTEGER DEFAULT 0;`); 
      console.log("  ✅ Added deleted column to shifts");
    } catch (e: any) {
      if (!e.message?.includes('duplicate column name')) {
        console.log("  ℹ️ deleted column already exists in shifts or error:", e.message);
      }
    }

    // Backfill shifts table timestamps
    try {
      db.execSync(`
        UPDATE shifts 
        SET created_at = ${now}, updated_at = ${now}, deleted = 0
        WHERE created_at IS NULL OR updated_at IS NULL
      `);
      console.log("  ✅ Backfilled timestamps for shifts records");
    } catch (e: any) {
      console.log("  ℹ️ No shifts records to backfill or error:", e.message);
    }

    console.log("✅ All database migrations finished successfully.");
  } catch (err) {
    console.log("❌ Migration Error:", err);
  }
}