// db/schema.ts

export const createUsersTable = `
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
    book_code TEXT NOT NULL,
    fayda_id TEXT NOT NULL,
    borrowed_at TEXT NOT NULL,
    returned_at TEXT,
    device_id TEXT,
    sync_status TEXT DEFAULT 'pending',

    FOREIGN KEY (book_code) REFERENCES books(book_code),
    FOREIGN KEY (fayda_id) REFERENCES users(fayda_id)
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

export const createLibrariansTable = `
  CREATE TABLE IF NOT EXISTS librarians (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('admin','librarian')),
    device_id TEXT NULL,
    salt TEXT,
    pin_hash TEXT,
    deleted INTEGER DEFAULT 0
  );
`;

export const createMetaTable = `
  CREATE TABLE IF NOT EXISTS meta (
    key TEXT PRIMARY KEY,
    value TEXT
  );
`;

export const createPendingCommitsTable = `
  CREATE TABLE IF NOT EXISTS pending_commits (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    action TEXT NOT NULL,
    table_name TEXT NOT NULL,
    payload TEXT NOT NULL,
    timestamp INTEGER NOT NULL,
    synced INTEGER DEFAULT 0
  );
`;

export const createCommitsTable = `
  CREATE TABLE IF NOT EXISTS commits (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    commit_id TEXT UNIQUE NOT NULL,
    librarian_username TEXT,
    device_id TEXT,
    type TEXT NOT NULL,
    payload TEXT NOT NULL,
    timestamp TEXT NOT NULL,
    pushed INTEGER DEFAULT 0
  );
`;

// SHIFT DEFINITIONS
export const createShiftsTable = `
  CREATE TABLE IF NOT EXISTS shifts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    librarian_username TEXT NOT NULL,
    date TEXT NOT NULL,              -- YYYY-MM-DD
    start_time TEXT NOT NULL,        -- HH:mm
    end_time TEXT NOT NULL,          -- HH:mm
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    deleted INTEGER DEFAULT 0,

    FOREIGN KEY(librarian_username) REFERENCES librarians(username)
  );
`;

// SHIFT ATTENDANCE LOG
export const createShiftAttendanceTable = `
  CREATE TABLE IF NOT EXISTS shift_attendance (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    librarian_username TEXT NOT NULL,
    shift_id INTEGER NOT NULL,
    clock_in INTEGER,
    clock_out INTEGER,
    status TEXT,                     -- on_time / late / absent / incomplete
    synced INTEGER DEFAULT 0,

    FOREIGN KEY(librarian_username) REFERENCES librarians(username),
    FOREIGN KEY(shift_id) REFERENCES shifts(id)
  );
`;


export const createIndexesSql = [
  `CREATE INDEX IF NOT EXISTS idx_books_title ON books(title);`,
  `CREATE INDEX IF NOT EXISTS idx_books_author ON books(author);`,
  `CREATE INDEX IF NOT EXISTS idx_books_category ON books(category);`,
  `CREATE INDEX IF NOT EXISTS idx_users_fayda ON users(fayda_id);`,
  `CREATE INDEX IF NOT EXISTS idx_transactions_txid ON transactions(tx_id);`,
  `CREATE INDEX IF NOT EXISTS idx_transactions_book ON transactions(book_code);`,
  `CREATE INDEX IF NOT EXISTS idx_transactions_fayda ON transactions(fayda_id);`
];
