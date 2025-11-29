Great — below is a careful, detailed **implementation plan for Phase 1.15 (Auth, device bootstrap, migrations, local session helpers, and audit/commit log)**. I won’t generate production code yet (per your request) — this is a step-by-step developer plan with the exact files to add/change, DB migration strategy, APIs you’ll need on server, UI touchpoints, and testing checklist. Follow it in order; each step is small and testable.

# Phase 1.15 — Implementation plan (high level)

Goal: Add secure local-first authentication for librarians/admins with a first-install online bootstrap that pulls authoritative data, plus local session helpers (SecureStore), strong typing, and commit/audit logs so all operations can be attributed to a librarian and later synced.

This plan is split into:

1. **DB schema + migrations**
2. **New DB helpers (`db/auth.ts`, commit log helpers)**
3. **Auth utilities (`lib/authUtils.ts`) and SecureStore helpers**
4. **Client UI & flows to integrate (no code yet)**
5. **Server API endpoints required**
6. **Edge cases / security rules**
7. **Testing & QA checklist**
8. **Files to create / modify**

---

# 1 — Database schema & migration plan

## New columns / tables to add (local SQLite):

We must evolve DB without destructive reset. Use one-time migration code (run-once) in `initDb()` or separate `migrateDatabase()` invoked from `_layout.tsx` (commented after run).

**Additions:**

1. `librarians` table (if not present — could reuse `users` but better separate)

```sql
CREATE TABLE IF NOT EXISTS librarians (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE,           -- human name or username
  pin_salt TEXT,                  -- salt for PIN hash
  pin_hash TEXT,                  -- hashed pin
  role TEXT CHECK(role IN ('admin','librarian')) DEFAULT 'librarian',
  device_id TEXT UNIQUE,          -- device currently bound for this librarian
  created_at TEXT,
  updated_at TEXT,
  deleted INTEGER DEFAULT 0       -- soft delete flag
);
```

2. `sessions` table (optional but useful for audit)

```sql
CREATE TABLE IF NOT EXISTS sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  librarian_username TEXT,
  device_id TEXT,
  token TEXT,
  created_at TEXT
);
```

3. `commits` (audit / operation log)

```sql
CREATE TABLE IF NOT EXISTS commits (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  commit_id TEXT UNIQUE,         -- server commit id or local uuid
  librarian_username TEXT,       -- who did it
  device_id TEXT,
  type TEXT,                     -- e.g., "create_book","borrow","return","create_librarian"
  payload TEXT,                  -- JSON string of operation details
  timestamp TEXT,
  pushed INTEGER DEFAULT 0       -- whether synced to server
);
```

4. Update `transactions` table to match borrow/return fields consistently:

* Add `borrowed_at` and `returned_at` columns (instead of generic timestamp)
* Keep `tx_id`, `book_code`, `fayda_id`, `device_id`, `sync_status`.

Migration SQL (pseudo-steps):

* ALTER TABLE transactions ADD COLUMN borrowed_at TEXT;
* ALTER TABLE transactions ADD COLUMN returned_at TEXT;
* Backfill: if `timestamp` exists and `type='borrow'` set `borrowed_at=timestamp` (and null returned_at), if `type='return'` set returned_at=timestamp.

**Important:** run each `ALTER TABLE` in try/catch and ignore duplicate column errors. Use `db.execSync` / `exec` once.

---

# 2 — DB helper files to add / update (local-only)

Create/Update these modules:

### `db/auth.ts` (NEW)

Responsibilities:

* createLibrarian({ username, pin, role, device_id? })
* verifyLibrarian(username, pin) → returns `true/false` and user object (role, device_id)
* bindDeviceToLibrarian(username, device_id)
* unbindDevice(username)
* getLibrarian(username)
* listLibrarians()
* deleteLibrarian(username) (soft delete)
* getCurrentLocalAdminExists() helper (to detect first-install case)

Behavior:

* Uses `lib/authUtils` (salt + hash) to create salt and hash.
* Returns/throws helpful errors (e.g., device-bound mismatch).

### `db/migrations.ts` (NEW) or extend `db/sqlite.ts`

Responsibilities:

* Expose `runMigrations()` function that:

  * Adds new columns/tables (with idempotent try/catch)
  * Backfills transaction timestamps into borrowed_at/returned_at
  * Adds `gender`, `address` columns for backward compatibility if not present
* Should be called at startup once; log results.

### `db/commits.ts` (NEW)

Responsibilities:

* appendCommit({ librarian_username, device_id, type, payload })
* listPendingCommits()
* markCommitsPushed(commitIds)

### Update existing DB files:

* `db/sqlite.ts`: export `db` typed wrapper and provide `runAsync`, `getAllAsync`, `execSync`, and `withTransactionSync` helpers (you already have similar). Add `openDatabase` with name `library.db`.
* `db/transactions.ts`: add `completeReturn(fayda_id, book_code)` that sets `returned_at`, increments book copies, creates a commit (call `db/commits.appendCommit`) to record the return operation and librarian who did it.

**Note:** Keep functions strongly typed via TypeScript types.

---

# 3 — Auth utilities & SecureStore session helpers

### `lib/authUtils.ts` (NEW)

Responsibilities:

* `generateSalt(): string`
* `hashPin(pin: string, salt: string): Promise<string>`
* `verifyPin(pin, salt, hash): Promise<boolean>`

Implementation notes (for later code generation):

* Use `expo-crypto` or `crypto.subtle` approaches to hash: use PBKDF2 or SHA-256 with salt and many iterations. E.g., PBKDF2(sha256) with 100k iterations → base64.
* Keep hashing async.

### `lib/secureSession.ts` (NEW)

Responsibilities:

* Wrap `SecureStore` (or `expo-secure-store`) helpers:

  * `saveSessionToken(tokenKey, tokenValue)`
  * `getSessionToken(tokenKey)`
  * `clearSessionToken(tokenKey)`
* Also short helpers: `storeCurrentUser(username)`, `getCurrentUser()`, `clearCurrentUser()`.
* Use SecureStore for `session token` and device-specific secret (not full credentials).

**Data stored in SecureStore:**

* session token (random string)
* device binding id (device id)
* small ephemeral secrets
  **Data stored in SQLite:**
* pin_hash, pin_salt, username, role, device_id (so server can see device bound)

---

# 4 — Client UI & flow changes (what screens to add/update)

### Screens to add:

* `app/auth/bootstrap.tsx` — “Initial bootstrap required” UI (internet required)
* `app/auth/login.tsx` — day-to-day login screen (username + PIN)
* `app/admin/manage-librarians.tsx` — admin-only UI to create/delete librarians
* `app/admin/device-management.tsx` — list device bindings, revoke device
* `app/auth/change-pin.tsx` — optional (but safe to include)
* Update `app/index.tsx` to show Dashboard if logged in, otherwise `login`
* Update `_layout.tsx` startup to run `migrateDatabase()` and check initialization status

### Flow integration:

* On app start, `_layout.tsx` calls `initDb()` -> `runMigrations()` -> check `librarians` table for any non-deleted admin.

  * If none OR `meta.initialized !== true` → route to `/auth/bootstrap`
  * Else route to `/auth/login`

* **Bootstrap flow**:

  1. User chooses “Begin Setup (Online Required)”
  2. App opens `/auth/bootstrap` which calls server `POST /bootstrap` (see server endpoints below)
  3. After pulling server snapshot, show login screen — **only admin accounts allowed at this step** (DiguwaSoft or any admin existing on server)
  4. On admin login success (server verifies pin), store admin locally (pin_salt/pin_hash), mark `meta.initialized = true` and store `last_pulled_commit`.
  5. Route to admin dashboard.

* **Normal day-to-day login**:

  * Username + PIN validated locally via `db/auth.ts -> verifyLibrarian()`
  * On success, create SecureStore session token and navigate to appropriate dashboard (admin flag toggles Admin menu).

* **Device binding rule**:

  * When a librarian first logs in successfully, if their `device_id` is `NULL`, bind this device (write device id to `librarians.device_id` and create commit).
  * If device_id exists and differs from current device id → deny login and show message: "Account bound to another device, contact admin".

* **Admin can unbind a device** from their Manage Librarians screen.

---

# 5 — Server API endpoints (sketch; server must exist)

Even if you don’t implement server now, plan for these endpoints so the bootstrap works and later sync works:

* `POST /bootstrap`

  * Request: { device_id, app_version }
  * Response: snapshot { books, users, librarians, commits, last_commit_id, server_time }
  * Purpose: initial pull.

* `POST /auth/admin-login`

  * Request: { username, pin }
  * Response: { success, token, librarian_data } (server verifies pin)
  * Purpose: allow admin bootstrap login (server-side authoritative)

* `POST /sync/commits`

  * Request: { device_id, commits: [ ... ] }
  * Response: { applied_commits, new_commits, conflict_info }
  * Purpose: push client commits and receive remote commits

* `GET /commits/since/:commit_id`

  * Purpose: fetch new commits since last known commit.

* `POST /librarians/create` (admin-only)

  * Create librarian on server (adds salt/hash), returns confirmation.

**Note:** You can mock server responses for early testing, but real server required for final bootstrap and sync.

---

# 6 — Edge cases & security design

**Device binding policy**

* One device per librarian by default. Admin can change binding.
* Rationale: prevents an ex-librarian from re-installing and using same username+PIN.

**Default Admin account**

* Keep special server-level account `DiguwaSoft` with known PIN (1366) for emergency/initial configuration. Implement server-side checks so it cannot be deleted.

**PIN rules**

* 4-digit PIN only? Recommend allowing 4 digits but treat as low-entropy — mitigate by:

  * Only allow local login for those pulled from server
  * Enforce device binding
  * Use PBKDF2 with strong salt/iterations for hashing

**Storage**

* Keep sensitive tokens in SecureStore; keep pin_hash and salt in SQLite.
* Never store raw PIN.

**Sync / race conditions**

* All operations create a `commit` (append to `commits`) with payload JSON (operation details + librarian_username + device_id).
* When pushing commits to server, server applies them atomically and returns new commit ids.
* Conflict handling: for simple operations (borrow/return), detect if server already applied (server replies with conflict code). Implement basic resolution: server wins; client fetches latest and replays local unpushed commits if necessary.

**Revoking librarian**

* Admin deletes (soft delete) librarian locally and pushes commit to server; server then prevents that username from authenticating during bootstrap or attempted login (if online).

**Offline-first**

* App should fully work offline after bootstrap — commits queue locally then push when online.

---

# 7 — Testing & QA checklist

For each implemented step add tests:

## DB & migration

* [ ] Fresh start: run `initDb()` and ensure tables created.
* [ ] Existing DB with old schema: run migrations and verify columns added; no data lost.
* [ ] Create test librarians, verify `device_id` add and uniqueness constraint.

## Bootstrap & first-install

* [ ] With empty DB, app goes to `/auth/bootstrap`
* [ ] Bootstrap pulls server snapshot (mocked ok)
* [ ] Admin can login via server credentials and local data is created
* [ ] After bootstrap, `meta.initialized` true and app routes to admin dashboard

## Day-to-day login

* [ ] Local login with correct PIN works
* [ ] Wrong PIN fails
* [ ] Device binding enforcement works: same user on different device blocked

## Commits & audit

* [ ] Borrow, return, create book, create user create commits with librarian info
* [ ] getPendingCommits lists unpushed commits
* [ ] After marking commits pushed they are flagged

## Security

* [ ] PIN not stored raw
* [ ] SecureStore contains only session tokens
* [ ] Soft delete prevents login after delete and appears in server

## E2E

* [ ] Admin creates librarian on Admin UI; librarian can activate new device via bootstrap
* [ ] Admin unbinds librarian device and librarian can login to new device

---

# 8 — Files to create / modify (concrete list)

**New files**

* `db/auth.ts` — (new DB helpers for librarian)
* `db/commits.ts` — commit log helpers
* `db/migrations.ts` — migration helpers (or extend `db/sqlite.ts`)
* `lib/authUtils.ts` — salt/hash/verify utilities
* `lib/secureSession.ts` — SecureStore wrappers
* `app/auth/bootstrap.tsx` — first-install bootstrap UI
* `app/auth/login.tsx` — login UI
* `app/admin/manage-librarians.tsx` — admin UI for create/delete/unbind librarian
* `app/admin/device-management.tsx` — optional
* `app/auth/change-pin.tsx` — optional

**Files to update**

* `db/sqlite.ts` — export typed db and include new migration invocation hook
* `db/transactions.ts` — add `completeReturn`, create commits on borrow/return
* `app/_layout.tsx` — call migrations, check initialization, and redirect into auth/bootstrap or login
* `app/index.tsx` — show dashboard if logged in, else route to login
* `app/users/register.tsx` and `app/users/edit/*` — make sure to log commits when admin/librarian creates or edits users
* `app/books/register.tsx` — create commit when adding book
* `app/transactions/*` — ensure commits created on borrow/return

---

# 9 — Suggested incremental implementation order (small steps)

1. **DB migrations** — add `migrations.ts`, run locally, verify schema updates.
2. **lib/authUtils + lib/secureSession** — implement salt/hash & SecureStore wrappers.
3. **db/auth.ts** — implement create/verify/bind functions using authUtils.
4. **db/commits.ts** — appendCommit, listPending, markPushed.
5. **Wire commits into existing actions** — borrowBook, returnBook, addBook, upsertUser should append a commit.
6. **Create login UI (`/auth/login`)** and `verifyLibrarian` flow; store session token in SecureStore.
7. **Create bootstrap UI** and mock server endpoint to test first-install flows.
8. **Device-binding enforcement** — integrate in `verifyLibrarian`.
9. **Admin manage-librarians UI** and actions (create/delete/unbind).
10. **Server sync skeleton** (even mocked) to push/pull commits.
11. **QA tests** from checklist, fix edge cases.

---

# 10 — Extra notes / security recommendations

* Prefer PBKDF2 with >100k iterations or Argon2 if available. Using expo-crypto PBKDF2 is fine.
* Use HTTPS for all server endpoints.
* Consider rotating device_id when re-binding; store previous device_id in commit for audit.
* Always log which librarian (username) performed an operation in the commit payload.
* Keep `DiguwaSoft` default admin on server only; client will receive it on bootstrap. Avoid hard-coding the PIN client-side.
