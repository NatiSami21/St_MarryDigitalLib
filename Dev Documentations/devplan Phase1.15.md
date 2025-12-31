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

---

---

# 🔵 **I. FIRST-INSTALL FLOWS (BOOTSTRAP) — TWO VARIATIONS**

Your logic says:

### ✔ New librarian can activate device on first install

### ✔ But only if admin created their account in cloud beforehand

### ✔ Only one device allowed per librarian

### ✔ Must change PIN after activation

This is now fully enforced.

---

# 🟦 **A. NEW LIBRARIAN FIRST-INSTALL FLOW**

This is used when:

* Admin added librarian on admin dashboard
* Librarian installs app on new phone
* Device is empty → app must bootstrap

### 🔥 This is the most important flow — and we now follow it exactly.

---

## **STEP 1 — App startup → Detect FIRST INSTALL**

We check:

```
if (!meta.initialized) OR librarians table empty:
    show /auth/bootstrap
```

---

## **STEP 2 — `/auth/bootstrap` screen**

UI:

* Title: *“Initial Setup Required”*
* Message: **Needs internet**
* Button: “Begin Setup (Online Required)”

User presses button → next step

---

## **STEP 3 — Show LOGIN (cloud authentication)**

This is **not** the day-to-day local login.
This login is for **cloud activation only**.

UI asks:

* Username
* PIN

This can be:

* New librarian with temporary PIN
* Admin
* Default Admin (`DiguwaSoft`, 1366)

---

## **STEP 4 — Client sends activation request**

```
POST /auth/activate
{
    username,
    pin,
    device_id
}
```

server returns:

### When success:

* Verified credentials
* Verified role
* Device binding OK
* Snapshot of:

  * books
  * users
  * librarians
  * commits
* last_pulled_commit
* required PIN change flag

### When fail:

* `invalid_username`
* `invalid_pin`
* `device_mismatch`
* `deleted_user`
* etc.

---

## **STEP 5 — Apply server snapshot locally**

Client wipes or merges relevant tables:

* librarians
* users
* books
* transactions
* commits
* meta

then sets:

```
meta.initialized = true
meta.last_pulled_commit = server value
meta.device_id = device_id
```

Now device is activated.

---

## **STEP 6 — FORCE Change PIN (mandatory)**

Admin-created PIN is temporary.
We protect against stolen temp PIN.

UI: `/auth/change-pin`
Inputs:

* old PIN
* new PIN
* confirm new PIN

Client updates:

* local SQLite (pin_hash, pin_salt)

Also sends:

```
POST /auth/change-pin
```

Success → dashboard.

---

## **STEP 7 — Redirect to appropriate dashboard**

If role = librarian → go to main dashboard
If role = admin → go to admin dashboard

---

# 🟦 **B. FIRST-INSTALL BY ADMIN (including DiguwaSoft)**

Identical steps, except:

* Admin enters username & PIN at activation
* Does NOT need to change PIN (optional)
* Can immediately manage librarians

---

# 🔵 **II. DAY-TO-DAY FLOWS (OFFLINE-FIRST)**

Exactly matching Overall app flow.md.

---

# 🟦 **1) Day-to-day Login**

User sees:

```
/auth/login
```

Input: username + 4-digit PIN

Client performs:

✔ Lookup username in `librarians`
✔ Hash PIN with stored salt
✔ Verify hash
✔ Check device binding

If OK → create SecureStore session:

```
currentUser = username
sessionToken = random
```

Navigate:

* admin → admin dashboard
* librarian → dashboard

No internet required.

---

# 🟦 **2) Borrow / Return / Edit Users / Add Books**

All local.
All create commit logs.

Commit example:

```
{
  commit_id,
  op_type: "borrow",
  payload: {...},
  librarian_id,
  timestamp
}
```

These remain “pending” until sync.

---

# 🟦 **3) Admin Functions — Day-to-day**

Admin can:

* create librarians
* create admins
* soft delete librarians
* unbind devices
* view commits
* revert recent commits
* sync now
* view analytics
* manage shifts

All actions create commits.

---

### **PHASE 1.15.4.1**

`/auth/bootstrap.tsx`
`/auth/login-cloud.tsx`
activation client logic
PIN change mandatory logic
snapshot apply logic

### **PHASE 1.15.4.2**

`/auth/login.tsx` (day-to-day offline login)

### **PHASE 1.15.4.3**

Admin dashboard entry points

### **PHASE 1.15.4.4**

Manage librarians

### **PHASE 1.15.4.5**

Device management

### **PHASE 1.15.4.6**

Change PIN page

### **PHASE 1.15.4.7**

layout/index integration

---

---

Perfect — everything is fully aligned and validated.
We are ready to **begin implementation of Phase 1.15.4.1**, following the exact logic you approved.

Before I generate the code, here is a clear breakdown of what we will implement in this step.

---

# ✅ **PHASE 1.15.4.1 — IMPLEMENTATION CONTENTS**

This phase includes **four major components**:

---

# 1) `/auth/bootstrap.tsx`

A clean and attractive UI in your blue theme:

### Responsibilities:

* Detect first-install state
* Show welcome/setup message
* Inform user internet is required
* “Begin Setup (Online Required)” button
* On press → navigate to `/auth/login-cloud`

### UX:

* Large icon / illustration
* App name
* Blue button
* Clean white background

---

# 2) `/auth/login-cloud.tsx`

This is the **Activation Login** screen.

### Responsibilities:

* Inputs for Username + PIN
* “Activate Device” button
* After submit:

```
POST /auth/activate {
   username,
   pin,
   device_id
}
```

### Handles server responses:

* invalid credentials
* device mismatch
* success → receives snapshot + role + requiredPinChange flag

### On success:

Navigate → `/auth/apply-snapshot` (we will embed this in the logic file)

---

# 3) Activation logic

A module: `lib/activation.ts`

### Responsibilities:

```ts
applySnapshotToLocalDB(snapshot)
saveMeta()
saveLocalLibrarianCredentials()
bindDeviceIfNeeded()
```

Snapshot includes:

* books
* users
* librarians
* commits (optional)
* last_pulled_commit

---

# 4) **Mandatory PIN Change Screen**

`/auth/change-pin.tsx`

### Responsibilities:

* old PIN (temporary)
* new PIN
* confirm new PIN
* validate match
* update:

```
local SQLite -> update pin_hash, salt
POST /auth/change-pin
```

### After success:

Go to dashboard based on role.

---

# 💙 DESIGN LANGUAGE

* Attractive **blue gradient** or blue solid header
* White cards
* Rounded corners
* Clean spacing
* No animation yet (saved for Phase 2)

---

Notes / assumptions:

I used process.env.EXPO_PUBLIC_ONLINE_MODE === "true" to toggle online mode. Make sure your .env contains EXPO_PUBLIC_ONLINE_MODE=true when you want real server calls. Default is mocked.

These files use your existing DB helpers runAsync, getAllAsync, and execSync exported from db/sqlite.ts. I call runAsync for parameterized inserts/updates so you avoid SQL string building.

The mocked snapshot is minimal but representative (books, users, librarians); adjust fields to match your real server snapshot shape.

After snapshot apply, the activation flow sets meta.initialized = 1 and meta.last_pulled_commit.

I kept UI styling consistent with your blue theme and simple card layout (no animations).

---

---

✅ Now proceeding to PHASE 1.15.4.2
/auth/login.tsx — Day-to-Day OFFLINE Login

(No network required, uses local SQLite & PIN hashing.)

This screen is used after device is initialized.
It performs:

Lookup local librarian by username

Verify device binding

Hash & compare PIN

Store session (SecureStore)

Redirect based on role:

admin → /admin

librarian → /

---

---

Home Dashboard (Librarian + Admin Shared)

We keep one unified dashboard but add Admin Button if role === 'admin'.

Phase 1.15.4.3

✔ Unified home dashboard
✔ Admin-only Administration button
✔ Clean, stable routing logic
✔ Works perfectly with bootstrap flow
✔ Blue UI theme

---

---

PHASE 1.15.4.5 — Manage Librarians

✔ List librarians
✔ Add librarian
✔ Soft-delete
✔ Reset PIN
✔ Unbind device
(Every action creates a commit)

PHASE 1.15.4.6 — Device Management

✔ View all device bindings
✔ Unbind a device
✔ Audit device activity

A) Manage Librarians (recommended first)
B) Device Management
C) Sync Control
D) Commit Logs
E) Shifts
F) Analytics
------------

---

---

# ✅ **PHASE 1.15.4.5 — Manage Librarians**

Admin features to implement:

✔ List librarians
✔ Add librarian
✔ Soft delete
✔ Reset PIN
✔ Unbind device
✔ Every action produces a commit in `pending_commits` table
✔ All operations are **offline-first**
✔ UI fully matches our admin theme

We will define:

1. **Folder + File Structure**
2. **Data Flow (offline-first)**
3. **Screen-by-screen UI definitions**
4. **DB Query Requirements**
5. **Commit Log Requirements**
6. **API interaction (mock unless ONLINE_MODE=true)**
7. **Edge cases & validations**

---

# 📁 **1. Folder & File Structure**

```
/app
  /admin
    /librarians
      list.tsx
      add.tsx
      details.tsx     ← where reset PIN, delete, unbind appear
```

---

# 🔵 **2. Data Flow (Offline-first)**

### **Local DB is the source of truth**

All librarians are in table:

```
librarians (
  id INTEGER PRIMARY KEY,
  username TEXT UNIQUE,
  full_name TEXT,
  role TEXT,           // "admin" or "librarian"
  device_id TEXT NULL,
  deleted INTEGER DEFAULT 0,
  salt TEXT NULL,
  pin_hash TEXT NULL
)
```

### All modifications follow the pattern:

#### **1. Update local DB**

#### **2. Insert a commit into `pending_commits`**

Commit example:

```json
{
  "table": "librarians",
  "action": "update",
  "payload": { ... },
  "timestamp": 1730000000000
}
```

### **3. If ONLINE_MODE = true → also hit API**

Else: mock success.

This ensures full offline-first behavior.

---

# 🖥️ **3. Screens UI & Logic (No code yet)**

## **A) librarians/list.tsx — List Librarians**

### **Purpose**

* Admin sees all librarians
* Soft-deleted are hidden
* Tapping one → open details screen

### **UI**

* Header: **“Librarians”**
* Search box (optional Phase 2, not now)
* Card list:

Card example:

```
[Full Name] (username)
Role: Admin / Librarian
Device: Bound / Not Bound
```

### **Buttons**

* “Add New Librarian” → /admin/librarians/add
* Each row is clickable → /admin/librarians/details?id=XY

### **Logic**

* Query local db: `getAllLibrarians()`
* Hide deleted rows (`deleted = 0`)
* Show device binding (device_id != null)

---

## **B) librarians/add.tsx — Add Librarian**

### **Input Fields**

* Full name
* Username
* PIN (4–6 digits)
* Role: dropdown (Admin, Librarian)

### **Flow**

1. Validate:

   * Username must be unique
   * PIN numeric & length OK
2. Generate salt
3. Hash PIN (`hashPin(pin, salt)`)
4. Insert into local DB
5. Insert commit:

```
action: "insert"
table: "librarians"
payload: {...}
```

6. If ONLINE_MODE=true → call POST `/admin/create-librarian`

### **Navigation**

After success → redirect to list screen.

---

## **C) librarians/details.tsx — Actions for 1 librarian**

Displays:

* Full name
* Username
* Role
* Device binding status
* Deleted or active
* Last login (optional later phase)

### **Buttons**

#### ✔ Reset PIN

* Input → new PIN
* Re-hash → update local DB
* Create commit:

  ```
  action: "update"
  field: "pin_hash"
  ```

#### ✔ Unbind Device

* Set `device_id = null` in DB
* Create commit:

  ```
  action: "unbind_device"
  ```

#### ✔ Soft Delete Librarian

* Set `deleted = 1`
* Create commit:

  ```
  action: "soft_delete"
  ```

All actions show confirmation modal before executing.

---

# 🟧 **4. DB Queries Needed (To be implemented next)**

You will need these new query functions:

### **list.tsx**

* `getAllLibrarians()`

### **add.tsx**

* `insertLibrarian(item)`
* `isUsernameTaken(username)`

### **details.tsx**

* `getLibrarianById(id)`
* `updateLibrarian(id, fields)`
* `softDeleteLibrarian(id)`
* `unbindLibrarianDevice(id)`
* `updateLibrarianPin(id, salt, hash)`

---

# 🟩 **5. Commit Log Requirements**

Every action must:

1. Update local DB immediately
2. Insert commit:

Fields:

```
id (auto)
type (librarian_add / librarian_update / librarian_delete / unbind_device)
payload JSON
timestamp
synced = 0
```

3. If ONLINE_MODE=true → call remote API
4. If offline → commit waits in storage

---

# 🔄 **6. ONLINE_MODE Integration**

Add at file top:

```ts
import { ONLINE_MODE } from "../../../config";
import { mockSuccess, postToServer } from "../../../utils/online";
```

### For every action:

```
if (ONLINE_MODE) {
  await postToServer(...)
} else {
  mockSuccess(...)
}
```

This is consistent with previous flows.

---

# 🧩 **7. Edge Cases & Validation Rules**

### Add librarian

* Username must be unique
* PIN must be numeric, min 4, max 6
* Role only “librarian” or “admin”

### Reset PIN

* Enforce strong PIN rules
* Never show old PIN

### Soft delete

* Admin cannot delete himself
* Admin cannot delete last remaining admin

### Unbind device

* If not bound → show warning
* Confirm twice: “This allows login from any device.”

---

# 🎉 Summary: Final Deliverables of Phase 1.15.4.5 (No Code)

You now have:

* **Full UI flow**
* **All required screens**
* **All DB operations**
* **All commit log actions**
* **Offline-first interaction rules**
* **ONLINE_MODE integration**
* **Edge-case handling**

---
---

# 🔵 **PHASE 1.15.4.6 — Device Management**
 
---

# 📘 **DRAFT PLAN — Device Management Module**

The goal is to enable admins to:

1. **View all devices currently bound to librarians**
2. **Inspect device details**
3. **Unbind a device** (so librarian must reactivate)
4. **Rebind device to another librarian** (optional in Phase 1)
5. **Rename device** (optional)
6. **Commit logs for all changes**

Devices are **not a separate table** in Phase 1 — because devices are simply:

### ✔ `librarians.device_id`

Each librarian has:

* **username**
* **role**
* **device_id** (string or null)

So a “device” = “the phone currently bound to a librarian”.

**Later (Phase 2)** we may add a dedicated `devices` table, but for Phase 1 this is not required.

---

# 🟦 **DEVICE MANAGEMENT SPECIFICATION**

## **1. List Devices**

We simply list all librarians that have `device_id != null`.

Display:

* Librarian full name
* Username
* Role
* Device ID
* Last sync time (optional from meta)

---

## **2. Unbind Device**

Update:

```sql
UPDATE librarians SET device_id = NULL WHERE id = ?
```

Create a commit:

```json
{
  "action": "unbind_device",
  "table": "librarians",
  "payload": { "id": librarian_id }
}
```

After unbinding, the librarian:

* Can still use the app until logout, BUT
* On next login → device mismatch → forced cloud activation

---

## **3. Rebind Device (Optional Phase 1)**

We can allow:

* Admin selects librarian A → Set device_id to some new value
* OR copy from another librarian (if transferring shared phone)

For Phase 1, **we’ll implement:**

* “Rebind manually: Enter new Device ID”

Phase 2:

* Auto-detect
* Transfer A → B

---

## **4. Rename Device**

Not needed because device_id is defined by OS.
Optional for later.

---

## **5. Device Details Screen**

Shows:

* Librarian
* Role
* Device ID
* Last sync
* Actions

  * Unbind
  * Rebind
  * View logs

---

# 🔵 **DB CHANGES NEEDED**

Good news:

### **We do NOT need new tables.**

Everything can use existing:

* **librarians** (device_id stored here)
* **pending_commits** (for unbind / rebind logs)
* **commits.ts** (already supports actions)

BUT we need some new **queries**:

---

# 🟦 **DB LAYER IMPLEMENTATION PLAN**

We will add these to:
`db/queries/devices.ts` (new file)

### ✔ 1. `getAllDevices()`

Returns all librarians with a device:

```sql
SELECT * FROM librarians
WHERE device_id IS NOT NULL AND deleted = 0
ORDER BY full_name ASC
```

---

### ✔ 2. `getDeviceById(device_id: string)`

Return the librarian using this device.

---

### ✔ 3. `unbindDevice(id: number)`

Same as unbinding a librarian → but wrapped logically.

This should internally call existing `unbindLibrarianDevice`.

---

### ✔ 4. `rebindDevice(id: number, newDeviceId: string)`

Update:

```sql
UPDATE librarians SET device_id = ? WHERE id = ?
```

Then commit:

```json
{
  "action": "rebind_device",
  "table": "librarians",
  "payload": { "id", "device_id": newDeviceId }
}
```

---

### ✔ 5. Optional: `getLastSyncForDevice(device_id)`

We can read from:

* meta table (last_pulled_commit)
* or sync_log table

This is optional for Phase 1.

--- 


---
---


# 🔵 **PHASE 1.15.4.7 — Sync Control (Admin Only)**

This is the **central control panel for all synchronization** between local device ↔ cloud.

We will design it cleanly in **3 layers**:

1. **Functional Specification (what features exist)**
2. **Data + DB Responsibilities**
3. **UI + Screens + Flow**
4. **Endpoints (mocked + real)**
5. **Then Implementation Steps**

---

# ✅ **1. Functional Specification**

## **Admin Sync Control Must Support:**

### ✔ **1. Show sync status**

* Last pull timestamp
* Last push timestamp
* Last error (if any)
* Pending commits count
* Device ID status (bound/unbound)

---

### ✔ **2. Manual Sync Actions**

Admin can trigger:

#### **A) PUSH COMMITS (local → cloud)**

* Sends all `pending_commits`
* Updates server
* Marks commits as synced
* Updates `sync_log`
* Requires online
* If `ONLINE_MODE = false` → simulate immediate success

#### **B) PULL SNAPSHOT (cloud → local)**

* Fetch snapshot from `/sync/snapshot`
* Apply to DB (books, users, librarians, transactions)
* Replace or merge
* Update `meta.last_pulled_commit`
* Requires online
* Mock mode allowed

#### **C) FULL SYNC (Push + Pull)**

* Step 1: Push pending
* Step 2: Pull snapshot
* Step 3: Show result
* This is the main recommended button
* With spinner + status feedback

---

### ✔ **3. Sync Logs**

Show historical logs from `sync_log` table:

* Timestamp
* Action (`push`, `pull`, `full_sync`)
* Status (`success`, `failed`)
* Message (details)

---

### ✔ **4. Edge Cases & Rules**

* If **no device_id**, DO NOT ALLOW sync
* If **pending_commits > 0**, push button becomes **primary**
* If **offline**, all sync buttons disabled unless mock mode
* Sync failures must be logged with details

---

# ✅ **2. Data Layer Requirements**

### Tables used:

### 1️⃣ `pending_commits`

* Contains unsynced local operations
* Sends them in batch to cloud
* After success → set `synced = 1`

### 2️⃣ `sync_log`

Stores entries:

```
{ id, device_id, status, details, timestamp }
```

### 3️⃣ `meta`

Used fields:

* `last_pulled_commit`
* `device_id`

---

# DB Queries Needed (New or Existing)

### ✔ Get pending commits count

### ✔ Mark commits as synced

### ✔ Insert log

### ✔ Fetch logs

### ✔ Get last sync timestamps

We already have part of this, but Sync Control will finalize them.

---

# 🟦 **3. UI Screens + Flow**

The UI for `/admin/sync/index.tsx` will have four sections:

---

## **A) Sync Summary Section**

```
Device ID: XXXXXXX
Pending Commits: 12
Last Push: 2025-01-xx
Last Pull: 2025-01-xx
Last Error: “network unreachable”
```

UI style: Blue clean card.

---

## **B) Actions Section**

Buttons:

### 1) **Push Pending Commits**

If pending > 0 → Highlight (blue).

### 2) **Pull Latest Snapshot**

Always available if online.

### 3) **Full Sync (Push + Pull)**

Primary button (thicker border or darker blue).

### 4) **Mock Mode Badge**

A small badge:

```
Mock Mode: ON
```

if `ONLINE_MODE = false`.

---

## **C) Sync Logs (Scrollable List)**

Log item:

```
[2025-01-12 10:21] ✔ Push | success
Details: 18 commits synced
```

---

## **D) Warnings**

If:

* device not bound → show red banner
* app not initialized → show yellow banner
* offline (real-mode) → show grey disabled overlay

---

# 🟦 **4. Cloud API (Mock + Real)**

### Real endpoints:

```
POST /sync/push
POST /sync/pull
GET  /sync/logs
```

Mock responses:

* Always success, fixed delay.
* Snapshot returns small dummy dataset.
* Push returns random server commit id.

We will wrap everything in:

```ts
if (!ONLINE_MODE) return mockResponse
```

This pattern is consistent with earlier phases.

---

# 🟦 **5. Implementation Steps**

We will implement in order:

---

## **STEP 1 — DB Layer /queries/sync.ts**

Includes:

✔ getPendingCommitsCount
✔ getLastPush
✔ getLastPull
✔ insertSyncLog
✔ markCommitsSynced
✔ persist snapshot metadata

---

## **STEP 2 — Sync Engine (`lib/syncEngine.ts`)**

Functions:

```
pushPendingCommits()
pullSnapshot()
fullSync()
```

Each returns structured:

```ts
{ ok: boolean; message: string }
```

---

## **STEP 3 — UI `/app/admin/sync/index.tsx`**

Includes:

* summary card
* buttons
* logs list
* loading spinners
* blocking UI
* error toast

---

## **STEP 4 — Wire Admin Shell**

Add “Sync Control” button:

```
router.push("/admin/sync")
```

---

## **STEP 5 — Testing + Mock Mode**

Use:

```
ONLINE_MODE = false
```

for local device testing offline.

---
 


---
---


Perfect — let's proceed with **PHASE 1.15.4.8 — Commit Logs**.

This is an important admin feature because it gives transparency into all offline changes that will sync or already synced.

Below is the full structured implementation plan.

---

# ✅ **PHASE 1.15.4.8 — Commit Logs**

## **What Commit Logs screen must show**

We want a screen under:

```
/admin/commits
```

It should display:

### **1. All pending commits (not yet synced)**

* action
* table affected
* timestamp
* payload (short preview)
* status (Pending)

### **2. All synced commits**

* action
* table
* timestamp
* payload
* status (Synced)

### **3. Search / filtering**

(optional for Phase 1, add in Phase 2)

* Filter by table (`books`, `users`, `transactions`, `librarians`, `devices`)
* Filter by commit type (`insert`, `update`, `delete`, etc.)
* Filter by status (`pending`, `synced`)

### **4. View full payload**

* click an item → modal with full JSON

---

# 🧱 **Step 1 — Database Layer (Already Partially Implemented)**

We already created **pending_commits**, but now we need:

### **A) Type definition**

### **B) Queries**

### **C) History table (optional)**

Server-side or local copy.

For Phase 1 (offline-first), we only need:

* View `pending_commits`
* View `pending_commits.synced = 1` after sync

No separate table required yet.

---

# 🧱 **Step 2 — DB Queries Implementation**

### **Create file: `/db/queries/commits.ts`**

It must include:

---

## ✔ 2.1 — Get all pending commits

```ts
export async function getPendingCommits(): Promise<PendingCommit[]> {
  return await getAllAsync<PendingCommit>(
    `SELECT * FROM pending_commits WHERE synced = 0 ORDER BY timestamp DESC`
  );
}
```

---

## ✔ 2.2 — Get all synced commits

```ts
export async function getSyncedCommits(): Promise<PendingCommit[]> {
  return await getAllAsync<PendingCommit>(
    `SELECT * FROM pending_commits WHERE synced = 1 ORDER BY timestamp DESC`
  );
}
```

---

## ✔ 2.3 — Mark commit as synced

(Used by sync engine)

```ts
export async function markCommitAsSynced(id: number) {
  await runAsync(
    `UPDATE pending_commits SET synced = 1 WHERE id = ?`,
    [id]
  );
}
```

---

## ✔ 2.4 — Delete commit (Phase 2 feature)

Not used for now but useful later.

```ts
export async function deleteCommit(id: number) {
  await runAsync(`DELETE FROM pending_commits WHERE id = ?`, [id]);
}
```

---

## ✔ 2.5 — Type Definition

```ts
export interface PendingCommit {
  id: number;
  action: string;
  table_name: string;
  payload: string;
  timestamp: number;
  synced: number;
}
```

---

# 🧱 **Step 3 — Commit Logs UI Plan**

Directory:

```
app/admin/commits/index.tsx
```

Screen includes:

---

## **🟦 A) Top Section — Quick Stats**

```
Pending: 12
Synced: 87
Last synced: 2 hours ago
```

---

## **🟩 B) Tabs**

* **Pending Commits**
* **Synced Commits**

Using:

```tsx
const [tab, setTab] = useState<"pending" | "synced">("pending");
```

---

## **🟨 C) List Component**

Each commit card includes:

* Action: `insert`, `update`, `borrow`, `return`, etc.
* Table: e.g., `transactions`
* Time: “3 minutes ago”
* Payload snippet:

  ```
  { "book_code": "BC-123" ... }
  ```
* Status badge (Pending / Synced)

---

## **🟧 D) View Full Payload Modal**

When clicking:

```
View Details
```

Opens modal with pretty-printed JSON.

---

# 🧱 **Step 4 — Wiring with Sync Engine**

### ⦿ Sync Engine should call:

```ts
await markCommitAsSynced(commit.id);
```

After successful push.

### ⦿ UI should listen for:

```
events.emit("commits-updated");
```

So the list refreshes automatically.

--- 

--- 
PHASE 1.15.4.9 — Shifts Module (Full Plan Overview)

The module has 4 sub-phases:

PHASE 1.15.4.9.1 — DB Schema + Queries + Commit Integration

✔ New shifts table
✔ New shift_attendance table
✔ Insert/update queries
✔ Attendance events (clock-in/out)
✔ Commit integration for sync

PHASE 1.15.4.9.2 — Admin UI: Shift Assignment

✔ Create weekly/daily shift schedules
✔ Assign librarian to time slots
✔ Edit & delete shifts
✔ View upcoming shifts
✔ All styled like the admin panel

PHASE 1.15.4.9.3 — Librarian UI: My Shifts

✔ Display “Today’s Shift”
✔ Show countdown to shift start
✔ Highlight current shift
✔ If user is in shift window → show CLOCK-IN button
✔ If user clocked in → show CLOCK-OUT button
✔ Sync attendance events to commits

PHASE 1.15.4.9.4 — Attendance Overview (Admin)

✔ View attendance logs
✔ Filter by librarian or date
✔ See who was late / on time / missing
✔ Export-ready data (used later in Reports phase)

---
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
