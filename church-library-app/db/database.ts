// db/database.ts
import * as SQLite from 'expo-sqlite';

// Initialize database with proper typing
export function initializeDatabase() {
  const db = SQLite.openDatabaseSync('library.db');
  
  db.withTransactionSync(() => {
    // Create tables
    db.execSync(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        fayda_id TEXT UNIQUE,
        name TEXT,
        phone TEXT,
        gender TEXT,
        address TEXT,
        photo_uri TEXT,
        created_at TEXT,
        updated_at TEXT,
        sync_status TEXT
      );
    `);
    
    db.execSync(`
      CREATE TABLE IF NOT EXISTS books (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        book_code TEXT UNIQUE,
        title TEXT,
        author TEXT,
        category TEXT,
        notes TEXT,
        copies INTEGER DEFAULT 1,
        created_at TEXT,
        updated_at TEXT,
        sync_status TEXT
      );
    `);
    
    // Add other tables...
    
    console.log('✅ Database initialized successfully');
  });
}

// Migration function using new API
export function migrateDatabase() {
  const db = SQLite.openDatabaseSync('library.db');
  
  try {
    db.withTransactionSync(() => {
      // Try to add missing columns
      try {
        db.execSync("ALTER TABLE users ADD COLUMN gender TEXT;");
        console.log('✅ Added gender column');
      } catch (e: any) {
        if (!e.message?.includes('duplicate column name')) {
          console.log('ℹ️ Gender column already exists');
        }
      }
      
      try {
        db.execSync("ALTER TABLE users ADD COLUMN address TEXT;");
        console.log('✅ Added address column');
      } catch (e: any) {
        if (!e.message?.includes('duplicate column name')) {
          console.log('ℹ️ Address column already exists');
        }
      }
    });
  } catch (error) {
    console.error('Migration failed:', error);
  }
}