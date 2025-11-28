// db/migrate.ts
import { db } from "./sqlite";

/**
 * Safe, idempotent migrations for the local DB.
 * Run once (or keep it called in init and comment it out after).
 */
export function migrateDatabase() {
  try {
    // Try to add borrowed_at and returned_at columns to transactions table
    try {
      db.execSync("ALTER TABLE transactions ADD COLUMN borrowed_at TEXT;");
      console.log("✅ Added transactions.borrowed_at");
    } catch (e: any) {
      // ignore if column exists
      console.log("ℹ️ transactions.borrowed_at may already exist:", e.message?.slice?.(0, 200));
    }

    try {
      db.execSync("ALTER TABLE transactions ADD COLUMN returned_at TEXT;");
      console.log("✅ Added transactions.returned_at");
    } catch (e: any) {
      console.log("ℹ️ transactions.returned_at may already exist:", e.message?.slice?.(0, 200));
    }

    // If you later want to add indexes, you can add CREATE INDEX statements here (safe if you check existence).
    console.log("✅ Database migration finished.");
  } catch (err) {
    console.error("❌ Migration failed:", err);
  }
}
