// db/sqlite.ts
import * as SQLite from 'expo-sqlite';
import {
  createUsersTable,
  createBooksTable,
  createTransactionsTable,
  createSyncLogTable,
  createIndexesSql,
} from './schema';

export const db = SQLite.openDatabaseSync('library.db');

export const initDb = () => {
  console.log('Initializing SQLite database...');

  try {
    // Ensure foreign keys are enforced
    db.execSync('PRAGMA foreign_keys = ON;');

    // Create tables
    db.execSync(createUsersTable);
    db.execSync(createBooksTable);
    db.execSync(createTransactionsTable);
    db.execSync(createSyncLogTable);

    // Create indexes for faster search
    createIndexesSql.forEach((sql) => db.execSync(sql));

    console.log('✅ SQLite DB initialized successfully');
  } catch (error) {
    console.log('❌ DB Initialization Error:', error);
  }
};
