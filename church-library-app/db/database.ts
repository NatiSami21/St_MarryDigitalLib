// db/database.ts
import * as SQLite from 'expo-sqlite';

// Migration function using new API
export function migrateDatabase() {
  const db = SQLite.openDatabaseSync("library.db");

  try {
    db.withTransactionSync(() => {
      // ---- USERS TABLE MIGRATIONS (already done before) ----
      try {
        db.execSync("ALTER TABLE users ADD COLUMN gender TEXT;");
      } catch {}
      try {
        db.execSync("ALTER TABLE users ADD COLUMN address TEXT;");
      } catch {}

      // ---- TRANSACTIONS TABLE MIGRATIONS ----

      // returned_at
      try {
        db.execSync("ALTER TABLE transactions ADD COLUMN returned_at TEXT;");
        console.log("✅ Added returned_at column");
      } catch (e: any) {
        if (!e.message.includes("duplicate column name"))
          console.log("ℹ️ returned_at already exists");
      }

      // status
      try {
        db.execSync(
          "ALTER TABLE transactions ADD COLUMN status TEXT DEFAULT 'borrowed';"
        );
        console.log("✅ Added status column");
      } catch (e: any) {
        if (!e.message.includes("duplicate column name"))
          console.log("ℹ️ status already exists");
      }

      // borrowed_at
      try {
        db.execSync("ALTER TABLE transactions ADD COLUMN borrowed_at TEXT;");
        console.log("✅ Added borrowed_at column");
      } catch (e: any) {
        if (!e.message.includes("duplicate column name"))
          console.log("ℹ️ borrowed_at already exists");
      }

      // device_id (optional)
      try {
        db.execSync("ALTER TABLE transactions ADD COLUMN device_id TEXT;");
        console.log("✅ Added device_id column");
      } catch (e: any) {
        if (!e.message.includes("duplicate column name"))
          console.log("ℹ️ device_id already exists");
      }

      // sync_status default
      try {
        db.execSync(
          "ALTER TABLE transactions ADD COLUMN sync_status TEXT DEFAULT 'pending';"
        );
        console.log("✅ Added sync_status column");
      } catch (e: any) {
        if (!e.message.includes("duplicate column name"))
          console.log("ℹ️ sync_status already exists");
      }
    });
  } catch (error) {
    console.error("Migration failed:", error);
  }
}