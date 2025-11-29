# Overall app flow — full, detailed, production-ready (first-install + day-to-day)

Great — here’s a single, exhaustive reference you can use to implement and test the whole app lifecycle. I split it into: **global architecture & data model**, then **First-Install (bootstrap) flows** and **Day-to-Day flows** for each user type (Default Admin, Admin, Librarian). After the flows you’ll find **edge cases, security rules, events & sync, tests**, and a short **implementation checklist**.

---

## High-level architecture (how pieces fit together)

* **Client (Expo app)**

  * Local store: **SQLite** for main data (books, users, transactions, librarians, commits, meta).
  * Secure local secrets: **SecureStore** for ephemeral session tokens / device secret.
  * UI screens + router (expo-router).
  * Dev/Prod: Expo Go for quick dev, EAS dev client / builds for features requiring native permissions.
* **Cloud backend** (authoritative)

  * Authentication endpoints (bootstrap & login).
  * Snapshot & commit APIs.
  * Librarian/admin management APIs.
  * Commit history + revert APIs.
  * Optional: Supabase / small REST service.
* **Sync model**

  * Client keeps local DB and an append-only **commit log** of operations (create-book, borrow, return, create-user, create-librarian, etc.).
  * Sync = push local commits → cloud; then pull new commits (or snapshot).
  * Cloud returns commit status and may return a snapshot for initial bootstrap.
* **Device binding**

  * Each librarian account can be bound to exactly one `device_id`. Cloud rejects bootstrap/login if device_id mismatches.

---

## Data model (core tables, minimal)

* `meta` — { initialized:boolean, last_pulled_commit:string, device_id:string }
* `librarians` — { id, name, role('admin'|'librarian'), pin_hash, salt, device_id?, created_at, updated_at, active:boolean }
* `books` — { id, book_code, title, author, category, copies, created_at, updated_at, sync_status }
* `users` — { id, fayda_id, name, gender, phone, address, photo_uri, created_at, updated_at, sync_status }
* `transactions` — { id, tx_id, book_code, fayda_id, type 'borrow'|'return', borrowed_at, returned_at?, device_id, sync_status }
* `commits` — append-only local operations: { id, commit_id, op_type, payload (json), created_at, pushed:boolean, librarian_id }
* `audit_log` — mirror of commits with result data and optionally server commit id.

> Note: use ISO timestamps (UTC) for all `*_at`. Keep commit ids as UUIDs.

---

## Global security principles (rules you must enforce)

1. **Device binding**: When a new librarian activates (first cloud login), cloud stores `device_id`. Subsequent cloud logins require matching device_id.
2. **Default Admin (DiguwaSoft)**: present on server as fallback. Cannot be deleted on server.
3. **Credentials**: store salted hashes (PBKDF2/Argon2) on server & client. Never store plain PIN. On client, store salt+hash in SQLite but keep session tokens in SecureStore.
4. **First-install requires internet** (bootstrap). Later daily logins are local only.
5. **Single device per librarian**: admin can unbind/reset device via cloud.
6. **All important actions create commits** (so they can be synced & reverted).
7. **Offline-first**: app is usable offline after bootstrap; commits queue for sync.

---

# First-install flows (bootstrap) — two variations

### A. Device with no local data (typical new install by *new librarian* who was created by admin)

This is the **new-librarian flow** (your preferred flow). Important: first-install activation only succeeds if the librarian exists on cloud and device is approved/unassigned.

**Screens & steps**

1. **Splash / Check**: app opens → `initDb()` runs → check `meta.initialized` or `librarians` table empty. If “not initialized” show **Initial Setup** screen.
2. **Initial Setup screen**: message: *“This device needs to connect to the central server to activate. Please have internet available.”* Button: **Begin Setup (Online required)**.
3. **Login prompt (cloud auth)**: ask `username` and `PIN` (temporary PIN provided by admin when admin created the librarian).

   * On submit → call `POST /auth/activate` with `{ username, pin, device_id }` (device_id generated client-side, stable per device).
4. **Cloud verifies**:

   * Validate credentials (use salt+hash). Confirm `active === true`.
   * If `device_id` field for that user is null/unassigned → server sets `device_id = provided_device_id` (bind device).
   * If server `device_id` already set and different → reject activation (explain "account already bound; contact admin").
5. **If cloud auth success**:

   * Server returns a **trusted snapshot** (full or incremental) and `last_pulled_commit` and the librarian record (including role).
   * Client applies snapshot to local SQLite (books, users, librarians, commits maybe).
   * Client saves librarian credentials locally: `librarians` entry with salt & pin-hash (the server should return salt so the client can store same hash or you can store a server-provided derived token).
   * Save session token in SecureStore, set `meta.initialized = true`, `meta.last_pulled_commit = id`.
   * Force **Change PIN** screen: require old pin + new pin (so admin-provided PIN is replaced immediately).

     * On success: update local librarian record and call `POST /auth/change-pin` to update server and confirm.
6. **Finish**: navigate to Dashboard. Role determines admin UI or not.

**Important constraints**:

* Only admins or existing librarians created on server will be able to activate. If admin created the librarian, they can provide a temporary PIN which must be changed on first activation.
* Default admin (`DiguwaSoft`) can also be used to bootstrap if no other admin exists.

---

### B. First-install by an **Admin** (including Default Admin)

Admin flow similar but server accepts Admin logins during bootstrap:

1. Begin Setup → **Admin Login** screen (username + PIN). Only admin accounts on cloud or Default Admin allowed.
2. Cloud verifies; server returns snapshot.
3. Client stores admin locally (salt/hash) and completes initialization.
4. Admin can immediately create librarians locally (creates commits) and choose to `push` commits to cloud.

---

# Day-to-day flows (offline-first)

## 1) Day-to-day Login (All users after bootstrap)

* Screen: **Login** asks `username` + `4-digit PIN`.
* Client logic:

  * Look up `librarians` table for username.
  * If not found → *show "User not found"* (if device is uninitialized, suggest bootstrap).
  * If found: compute hash(salt + PIN) and compare with stored `pin_hash`.
  * If match → set `currentUser` in session (store session token in SecureStore or ephemeral memory) and open Dashboard.
  * If role === `admin` → show Admin features.
* No network required.
* PIN retries: allow limited attempts (e.g., 5) before temporary lockout (local counter) to reduce brute force.

## 2) Day-to-day operations (example: borrow book)

* All operations create a **commit** record with `librarian_id`, `op_type`, `payload`, `timestamp`. They also immediately update local DB to reflect the result (optimistic).
* Example `borrow`:

  1. UI: scan book → load user → confirm borrow.
  2. Client creates SQL transaction:

     * Insert into `transactions` with `borrowed_at`, `returned_at = null`, `device_id = meta.device_id` and `sync_status = 'pending'`.
     * Decrement `books.copies` locally.
  3. Add `commits` entry `{ commit_id, op: 'borrow', payload: { tx_id, fayda_id, book_code, borrowed_at }, librarian_id }`.
  4. Render success to UI.
* Commit will be `pushed = false` until sync.

## 3) Admin functions (day-to-day)

* Manage librarians (create local commit + optionally push immediately).
* Trigger manual sync.
* View commit logs (with ability to revert recent commit; revert creates a new commit that inverses previous).
* See shift-based analytics.

---

# Sync model & server interactions

### Commit lifecycle (client)

1. Create commit (local).
2. Mark `commits.pushed = false`.
3. Periodically or manually push queue to server: `POST /sync/push` with batch commits + device_id + last_pulled_commit.
4. Server validates commits in order (idempotency), applies authoritative changes, returns `server_commit_id` and updated `last_pulled_commit`.
5. Client marks local commits as pushed and updates meta.
6. Client pulls new commits from server `GET /sync/pull?since=last_pulled_commit` and applies them to local DB.

### Revert / rollback

* Server supports a `revert` API that produces inverse commits (or marks a commit as reverted). Admin UI can trigger revert; server generates inverse operation or instructs clients to undo.
* Client applying a revert should be able to re-run operations deterministically (careful with side effects like deleting a book that has active borrows — server should refuse impossible reverts).

### Conflict strategy

* Authoritative server state wins for conflicts during push. Client should show conflict errors and allow admin to reconcile.

---

# Device binding & change-device flow

* On first cloud activation, server stores `device_id` for that librarian.
* Subsequent cloud activations require same `device_id` or server will reject.
* To move a librarian to a new device:

  1. Admin uses admin dashboard `Unbind device` action for that librarian (creates a commit).
  2. Librarian activates new device with their username + pin; server accepts (device_id becomes new device).
  3. Optionally, admin reviews previous device commits.

---

# UI flows summary (screens & transitions)

* Splash -> Check DB -> (if uninitialized) **Initial Setup** -> **Cloud Login** -> **Change PIN** -> Dashboard
* Dashboard (different tiles): Books, Users, Borrow, Return, Transactions, Reports, Administration (admins only)
* Books:

  * Books List (`/books/list`) -> Book Details `/books/[code]` -> Register Book
  * Inventory screen `/books/inventory` (upgrade)
  * Scan book `/books/scan`
* Users:

  * Users List -> User Details `/users/[fayda_id]` -> Edit -> Borrow History
  * Scan user `/users/scan`
* Borrow:

  * Option A: Single screen where scan fills fields (your earlier approach; risk of race/loop)
  * Option B (recommended stable flow): Two-step scanning flow (scan book -> scan user -> confirm) — you already moved to this and it solves params looping.
* Transactions:

  * Transactions list / filters, per-user & per-book history screens, revert actions (admin).
* Reports:

  * Reports screen with CSV export (daily/week/month/year).
* Administration (admin only):

  * Manage librarians (create/unbind/delete)
  * View commits & revert
  * Sync control
  * Shift setup & shift logs

---

# Detailed sequence examples (text diagrams)

### Example: New librarian activation (high level)

1. `App` -> `Initial Setup` -> user taps Begin Setup.
2. `App` -> `POST /auth/activate` `{ username, pin, device_id }`.
3. Server verifies; if ok: returns snapshot + salts + lastCommit.
4. `App` applies snapshot -> stores librarian locally -> sets meta.initialized = true.
5. `App` forces PIN change -> `POST /auth/change-pin`.
6. Done.

### Example: Borrow → offline → sync

1. Librarian borrows book offline -> local transaction + `commit(op=borrow)`.
2. After several operations, admin triggers `sync push`.
3. App sends commits to server. Server processes them sequentially and responds with success & server commit ids.
4. App marks local commits pushed.

---

# Edge cases & how to handle them

* **No connectivity at first install** → block activation and show friendly message. Provide instructions (connect to Wi-Fi / mobile data).
* **Wrong username or PIN during activation** → show clear error. Allow retry with rate-limit.
* **Device already bound** → server rejects activation; show message: “This account is already active on a device. Contact admin to reassign.”
* **Conflicting commits** → server returns conflict per-commit; mark commit with error and show admin UI to resolve.
* **Device stolen** → admin unbinds librarians from cloud and marks devices invalid. Optionally mark last known device revoked.
* **Database migration** → run idempotent `ALTER TABLE` statements in an initialization/migration script that executes once (as you already did).
* **Backup & restore** → admin can request a cloud snapshot of DB.

---

# Acceptance tests (what to validate during QA)

### First-install tests

* Fresh device: `Initial Setup` appears.
* Admin activation succeeds with Default Admin (DiguwaSoft:1366).
* New librarian activation succeeds only if registered on cloud and device_id unassigned.
* New librarian forced to change PIN.
* After bootstrap, `meta.initialized === true` and app works offline.

### Day-to-day tests

* Local login with PIN works.
* Borrow flow: local DB transaction created, book copies decremented.
* Return flow: returned_at set; copies incremented, commit logged.
* CSV report generation and share/save works (expo-file-system + sharing).
* Device binding: attempts to activate same librarian on second device rejected until admin unbinds.

### Security tests

* PIN stored only hashed + salted.
* Device_id required on server login.
* Attempt to bootstrap without network fails gracefully.

---

# Implementation checklist (phase-by-phase tasks)

**Phase 1 (complete MVP)**

* ✅ Local DB tables, migrations
* ✅ Book register + QR + gallery save
* ✅ User register & photo upload
* ✅ Borrow/Return local logic + transactions table
* ✅ Per-user, per-book history screens
* ✅ Reports CSV export

**Phase 1.15 (Auth & device binding)**

* [ ] Add `librarians` table + pin hashing functions (lib/authUtils.ts)
* [ ] Add SecureStore wrappers for session tokens
* [ ] Add `commits` / `audit_log` table and local commit helper
* [ ] Create `Initial Setup` screen + cloud activate endpoint
* [ ] Cloud server endpoints (bootstrap, auth/activate, auth/change-pin, sync/push, sync/pull)
* [ ] Device binding logic on server and client
* [ ] Admin UI for managing librarians and unbind/reset device
* [ ] Tests for activation, device binding, revoke flows

**Phase 2 (UX polishing & hardened sync)**

* UI polish with animations & native feel
* Resolve conflicts, implement revert/undo behavior
* Add encryption on SQLite if required (sensitive deployments)

---

# Final notes / recommendations

* **Prefer separate scan screens** for book/user then confirm screen (you already implemented this; it solved params-loop). Keep that pattern — much simpler to reason about and debug.
* **Pin hashing**: use a strong algorithm (Argon2 if available server-side; PBKDF2 if easier). On client, store salt + derived hash for local verification.
* **Device id stability**: generate `device_id` using SecureStore-only value (UUID stored in SecureStore) — it should survive app updates but not uninstall. That’s good (uninstall = lost device binding), and admin must unbind to allow reactivation.
* **Restrict critical server APIs**: only admins allowed to create librarians and unbind device.
* **Testing**: include an automated test plan covering activation, device-change and revoke flows.
