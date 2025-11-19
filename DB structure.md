
Below is the **final, clean, production-ready DB structure** for:

### ✅ SQLite (offline local DB)

### ✅ Supabase (online sync DB)

Both must mirror each other so syncing becomes easy and conflict-free.

---

# 📌 **Digital Library System — Database Structure**

We will create **4 core tables**, plus **2 optional helper tables**.

---

# 1️⃣ **users** (Registered Library Users — via Fayda ID)

### **Purpose**

Stores minimal information about each user. Identification is done via **16-digit Fayda ID barcode**.

### **Columns**

| Column      | Type           | Local (SQLite) | Remote (Supabase) | Notes                       |
| ----------- | -------------- | -------------- | ----------------- | --------------------------- |
| id          | integer (auto) | Yes            | No                | SQLite primary key          |
| fayda_id    | text           | Yes            | PK                | 16-digit unique ID, scanned |
| name        | text           | Yes            | Yes               | Required                    |
| phone       | text           | Yes            | Yes               | Optional                    |
| photo_uri   | text           | Yes            | No                | Local image path only       |
| photo_url   | text           | No             | Yes               | Supabase Storage URL        |
| created_at  | text/datetime  | Yes            | Yes               |                             |
| updated_at  | text/datetime  | Yes            | Yes               |                             |
| sync_status | text           | Yes            | No                | ("pending", "synced")       |

### **Notes**

* Local keeps *photo_uri*.
* Remote keeps *photo_url* (uploaded later).
* Fayda ID is globally unique → perfect primary key.

---

# 2️⃣ **books** (Registered books with QR Code)

### **Columns**

| Column      | Type    | Local | Remote | Notes            |
| ----------- | ------- | ----- | ------ | ---------------- |
| id          | integer | Yes   | No     | SQLite auto ID   |
| book_code   | text    | Yes   | PK     | Unique UUID/slug |
| title       | text    | Yes   | Yes    |                  |
| author      | text    | Yes   | Yes    |                  |
| category    | text    | Yes   | Yes    |                  |
| notes       | text    | Yes   | Yes    |                  |
| copies      | integer | Yes   | Yes    | Default 1        |
| created_at  | text    | Yes   | Yes    |                  |
| updated_at  | text    | Yes   | Yes    |                  |
| sync_status | text    | Yes   | No     |                  |

---

# 3️⃣ **transactions** (Borrow / Return Actions)

This is the heart of tracking book usage.

### **Columns**

| Column      | Type    | Local | Remote | Notes                      |
| ----------- | ------- | ----- | ------ | -------------------------- |
| id          | integer | Yes   | No     | Auto ID                    |
| tx_id       | text    | Yes   | PK     | UUID for global uniqueness |
| book_code   | text    | Yes   | FK     |                            |
| fayda_id    | text    | Yes   | FK     |                            |
| type        | text    | Yes   | Yes    | "borrow" or "return"       |
| timestamp   | text    | Yes   | Yes    | device timestamp           |
| device_id   | text    | Yes   | Yes    | each librarian phone       |
| sync_status | text    | Yes   | No     | pending/synced             |

### **Borrow/Return Logic**

Borrow = insert
Return = insert separate TX row **or** update latest borrow:

📌 **We use INSERT for both** → easier to track conflicts & history.

Example, book borrowed → one row.
Returned → another row.

---

# 4️⃣ **sync_log** (Metadata for troubleshooting)

### **Columns**

| Column    | Type    | Local | Remote | Notes                                     |
| --------- | ------- | ----- | ------ | ----------------------------------------- |
| id        | integer | Yes   | Yes    |                                           |
| device_id | text    | Yes   | Yes    |                                           |
| status    | text    | Yes   | Yes    | "success", "partial", "conflict", "error" |
| details   | text    | Yes   | Yes    | JSON blob                                 |
| timestamp | text    | Yes   | Yes    |                                           |

---

# 5️⃣ (Optional) **devices**

Track which phones are active.

---

# 📌 **RELATIONSHIPS**

### 1. `users (1) — (many) transactions`

via `fayda_id`

### 2. `books (1) — (many) transactions`

via `book_code`

### 3. No foreign key enforcement in SQLite (to avoid crashes)

But **Supabase will enforce real constraints**.

---

# ✔️ **Final Schema (SQLite)**

```sql
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

CREATE TABLE IF NOT EXISTS sync_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  device_id TEXT,
  status TEXT,
  details TEXT,
  timestamp TEXT
);
```

---

# ✔️ **Final Schema (Supabase / Postgres)**

```sql
CREATE TABLE users (
  fayda_id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT,
  photo_url TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE books (
  book_code TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  author TEXT,
  category TEXT,
  notes TEXT,
  copies INT DEFAULT 1,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE transactions (
  tx_id TEXT PRIMARY KEY,
  book_code TEXT REFERENCES books (book_code),
  fayda_id TEXT REFERENCES users (fayda_id),
  type TEXT CHECK (type IN ('borrow', 'return')),
  timestamp TIMESTAMP,
  device_id TEXT
);

CREATE TABLE sync_log (
  id BIGSERIAL PRIMARY KEY,
  device_id TEXT,
  status TEXT,
  details JSONB,
  timestamp TIMESTAMP DEFAULT NOW()
);
```

--- 