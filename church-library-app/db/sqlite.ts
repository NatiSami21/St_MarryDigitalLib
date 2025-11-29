// db/sqlite.ts
import * as SQLite from "expo-sqlite";
import {
  createUsersTable,
  createBooksTable,
  createTransactionsTable,
  createSyncLogTable,
  createIndexesSql,
} from "./schema";

export const db = SQLite.openDatabaseSync("library.db");

export const initDb = () => {
  console.log("Initializing SQLite database...");

  try {
    db.execSync("PRAGMA foreign_keys = ON;");

    db.execSync(createUsersTable);
    db.execSync(createBooksTable);
    db.execSync(createTransactionsTable);
    db.execSync(createSyncLogTable);

    createIndexesSql.forEach((sql) => db.execSync(sql));

    console.log("✅ SQLite DB initialized successfully");
  } catch (error) {
    console.log("❌ DB Initialization Error:", error);
  }
};

/* ----------------------------------------------------
 * Helper: runAsync → Simulated async wrapper
 * -------------------------------------------------- */
export function runAsync(sql: string, params: any[] = []): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      db.runSync(sql, params);
      resolve();
    } catch (err) {
      reject(err);
    }
  });
}

/* ----------------------------------------------------
 * Helper: getAllAsync
 * -------------------------------------------------- */
export function getAllAsync<T = any>(
  sql: string,
  params: any[] = []
): Promise<T[]> {
  return new Promise((resolve, reject) => {
    try {
      const rows = db.getAllSync(sql, params) as T[];
      resolve(rows);
    } catch (err) {
      reject(err);
    }
  });
}

/* ----------------------------------------------------
 * Helper: execSync (wrapper for multi-SQL)
 * -------------------------------------------------- */
export function execSync(sql: string) {
  db.execSync(sql);
}

/* ----------------------------------------------------
 * Sync transaction wrapper
 * -------------------------------------------------- */
export function withTransactionSync(fn: () => void) {
  db.withTransactionSync(fn);
}
