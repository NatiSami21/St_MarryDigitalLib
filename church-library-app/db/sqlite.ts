// db/sqlite.ts
import * as SQLite from "expo-sqlite";
import {
  createUsersTable,
  createBooksTable,
  createTransactionsTable,
  createSyncLogTable,
  createLibrariansTable,
  createMetaTable,
  createPendingCommitsTable,
  createCommitsTable,
  createIndexesSql,
  createShiftsTable,
  createShiftAttendanceTable
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
    db.execSync(createLibrariansTable);

    db.execSync(createMetaTable);
    db.execSync(createPendingCommitsTable);
    db.execSync(createCommitsTable);

    db.execSync(createShiftsTable);
    db.execSync(createShiftAttendanceTable);


    createIndexesSql.forEach(sql => db.execSync(sql));

    console.log("✅ SQLite DB initialized successfully");
  } catch (error) {
    console.log("❌ DB Initialization Error:", error);
  }
};

// async wrappers
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

export function getAllAsync<T = any>(sql: string, params: any[] = []): Promise<T[]> {
  return new Promise((resolve, reject) => {
    try {
      const rows = db.getAllSync(sql, params) as T[];
      resolve(rows);
    } catch (err) {
      reject(err);
    }
  });
}

export function getOneAsync<T = any>(sql: string, params: any[] = []): Promise<T | null> {
  return new Promise((resolve, reject) => {
    try {
      const rows = db.getAllSync(sql, params) as T[];
      resolve(rows.length > 0 ? rows[0] : null);
    } catch (err) {
      reject(err);
    }
  });
}

export function execSync(sql: string) {
  db.execSync(sql);
}

export function withTransactionSync(fn: () => void) {
  db.withTransactionSync(fn);
}
