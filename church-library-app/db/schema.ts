// db/schema.ts

export const createUsersTable = `
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    fayda_id TEXT UNIQUE,
    name TEXT,
    phone TEXT,
    photo_uri TEXT,
    created_at TEXT,
    updated_at TEXT,
    sync_status TEXT
  );
`;

export const createBooksTable = `
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
`;

export const createTransactionsTable = `
  CREATE TABLE IF NOT EXISTS transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tx_id TEXT UNIQUE,
    book_code TEXT,
    fayda_id TEXT,
    type TEXT,
    timestamp TEXT,
    device_id TEXT,
    sync_status TEXT
  );
`;

export const createSyncLogTable = `
  CREATE TABLE IF NOT EXISTS sync_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    device_id TEXT,
    status TEXT,
    details TEXT,
    timestamp TEXT
  );
`;
