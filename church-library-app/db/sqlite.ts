// db/sqlite.ts

import * as SQLite from 'expo-sqlite';
import { 
  createUsersTable, 
  createBooksTable, 
  createTransactionsTable, 
  createSyncLogTable 
} from './schema';

// open database
export const db = SQLite.openDatabaseSync('library.db');

export const initDb = () => {
  console.log("Initializing SQLite database...");

  try {
    db.execSync(createUsersTable);
    db.execSync(createBooksTable);
    db.execSync(createTransactionsTable);
    db.execSync(createSyncLogTable);
    console.log("✅ SQLite DB initialized successfully");
  } catch (error) {
    console.log("❌ DB Initialization Error:", error);
  }
};
