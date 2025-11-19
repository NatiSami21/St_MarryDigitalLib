## Phase 0 — Setup & Project Foundation (what we start with)

Goal: create a reproducible project scaffold, local DB bootstrap, and remote Supabase skeleton so subsequent work is fast.

### Tasks

1. **Create repo & trunk**

   * Create Git repo (GitHub/GitLab) and main branches: `main`, `dev`.
   * Add README with project summary (copy intro from proposal).
2. **Initialize Expo project**

   * `expo init church-library-app` → choose `blank (TypeScript)` template.
   * Commit initial files.
3. **Code style & tooling**

   * Install and configure: TypeScript, ESLint, Prettier, Husky (pre-commit linting).
   * Create basic folder structure (suggested):

     ```
     src/
       screens/
       components/
       services/
       database/
       hooks/
       context/
       utils/
       assets/
     ```
4. **Install dependencies**

   * Core libs:

     * `expo install expo-sqlite expo-file-system expo-barcode-scanner expo-camera`
     * `yarn add react-native-qrcode-svg uuid @supabase/supabase-js`
     * Optional UI: `react-native-paper` or your preferred UI lib.
5. **Supabase initial setup**

   * Create Supabase project.
   * Create tables mirroring local schema (Users, Books, Transactions, SyncLog) — basic columns to start. (We’ll extend later).
   * Obtain `anon`/service keys for dev; store in `.env` (do not commit).
6. **SQLite bootstrap**

   * Create `src/database/init.ts` responsible for:

     * Opening SQLite DB.
     * Creating tables if not exist: `users`, `books`, `transactions`, `sync_log`.
   * Add a small DB helper wrapper `src/database/db.ts` (see next phase for function list).
7. **App skeleton & navigation**

   * Install navigation: `expo-router` or `@react-navigation/native`.
   * Create placeholder screens: `Dashboard`, `RegisterBook`, `RegisterUser`, `Scanner`, `Reports`, `Sync`, `Settings`.
8. **CI (optional)**

   * Basic GitHub Actions to run lint & tests on PRs.

### Acceptance criteria

* Project builds and launches in Expo Go with placeholder screens.
* SQLite tables are created on first run.
* Supabase project exists with empty tables and keys accessible for dev.

---

## Phase 1 — Core MVP (book/user register, borrow/return, local DB, QR gen/scan)

Goal: shipping the core offline flows described in the proposal.

### 1. Book Registration (screen + QR generation)

**Work**

* Build `RegisterBook` screen form: `title, author, category (dropdown), notes, copies`.
* On submit:

  * Generate `book_code` (UUID or short unique string).
  * Save book into local SQLite via `db.addBook`.
  * Generate QR image (using `react-native-qrcode-svg`) with payload = `book_code`.
  * Offer actions: `Save QR to gallery` and `Share / Email` (use `expo-file-system` + `MediaLibrary`).
    **DB function**
* `addBook(book: {book_code, title, author, category, notes})`
  **Acceptance**
* New book appears in local books list.
* QR image saved to gallery and decodes to exact `book_code`.

### 2. User Registration (Fayda scan + optional photo)

**Work**

* `RegisterUser` screen:

  * Primary flow: **Scan Fayda barcode** (expo-barcode-scanner) → extract 16-digit `fayda_id`.
  * If user not found: show quick form `name, phone`, optional `photo` (camera).
  * Save to SQLite `users` table.
* Optional: provide "search by Fayda ID" input for manual registrations.
  **DB function**
* `addUser({fayda_id, name, phone, photo_uri})`
  **Acceptance**
* Scanning Fayda barcode loads or creates a user record with `fayda_id`.

### 3. Scanner (Borrow / Return)

**Work**

* Implement `Scanner` screen with toggle `Borrow` / `Return`.
* Borrow mode flow:

  1. Scan Fayda → validate user exists (or allow quick register).
  2. Scan Book QR → lookup book in local DB.
  3. Check availability (if copies tracked).
  4. Insert a `transaction` row with `tx_id` (UUID), `book_code`, `fayda_id`, `type='borrow'`, `timestamp`, `sync_status='pending'`.
* Return mode flow:

  1. Scan Book QR → find last borrow transaction without return → update `returnDate` or insert `return` transaction; mark `sync_status='pending'`.
     **DB functions**
* `borrowBook(book_code, fayda_id, device_id)` → creates TX.
* `returnBook(book_code, device_id)` → marks return TX.
  **Acceptance**
* Scanner flow writes correct transaction rows in SQLite.
* UI feedback (toast/confirm) after successful action.

### 4. Local DB Helper (`src/database/db.ts`)

Implement these functions:

* `initializeDb()` — creates tables.
* `addBook(book)`
* `getBookByCode(book_code)`
* `listBooks(filter?)`
* `addUser(user)`
* `getUserByFayda(fayda_id)`
* `borrowBook(...)`
* `returnBook(...)`
* `listPendingTransactions()`
* `markTransactionsSynced(tx_ids[], server_timestamps?)`
* `exportData()` — export SQLite to JSON/CSV for backups.
  **Acceptance**
* All above functions tested via simple unit or smoke tests.

### 5. Reports Screen

**Work**

* Implement local queries for:

  * Unreturned/overdue (`borrowed & not returned & age > loanPeriod`).
  * Top borrowed books (COUNT by book_code).
  * Top readers (COUNT by fayda_id).
  * Category counts (GROUP BY).
* UI: simple tables with `Export CSV` button (use `expo-file-system`).
  **Acceptance**
* Reports display accurate values using local transactions.

---

## Phase 2 — Sync Infrastructure (Supabase integration)

Goal: reliably upload pending local changes and download remote changes so multiple devices can operate.

### 1. Design sync contract

* Client sends bundle:

  ```json
  {
    "device_id":"<uuid>",
    "transactions":[{tx_id, book_code, fayda_id, type, timestamp}],
    "users":[{fayda_id, name, phone}],
    "books":[{book_code, title, ...}]
  }
  ```
* Server responds:

  * `accepted_tx_ids`, `rejected_tx_ids` (with reasons), `server_timestamps`, `conflicts` list.

### 2. Implement `services/syncService.ts`

* Functions:

  * `syncNow()`:

    * Collect pending records: `listPendingTransactions()`, new users, books.
    * Upload batch to Supabase API (use Postgres RPC or REST endpoint).
    * Handle response: mark accepted as `synced`, show conflicts in UI.
    * Pull server-side records newer than last sync and merge.
  * `autoSyncEveryXHours()`:

    * Schedule with background timer (`expo-task-manager` or simple in-app interval) and only run on Wi-Fi (`expo-network`).

### 3. Server side (Supabase)

* Create endpoints/RPC or use direct table inserts with Row Level Security off initially for testing.
* Server validation:

  * Check `fayda_id` format, unique `tx_id` dedupe.
  * Return conflict if same `book_code` already borrowed by another device and overlapping times.

### 4. Conflict UI

* `Sync` screen should show a `Conflicts` list with human-friendly messages and actions: `Accept remote`, `Keep local`, `Manual merge`.

### Acceptance

* Pending transactions are cleared and marked `synced` after successful sync.
* Conflicts appear in the list when expected and admin can resolve.

---

## Phase 3 — Polish, Tests, Distribution

### Tasks

1. **User roles & minimal auth (optional)**

   * Add device tokens or simple librarian PIN to avoid accidental edits.
2. **Backup & restore**

   * Implement `Export DB` and `Import DB` features; auto backup to Supabase storage (optional).
3. **Performance & UX**

   * Optimize scanning experience (continuous scanning, quick confirmations).
   * Add last sync timestamp & sync health indicator.
4. **Testing**

   * Manual test plan: coverage for offline day-long simulation:

     * 50-200 borrow/return cycles, then sync.
     * Conflict scenario: two devices borrow same book offline.
   * Unit tests for DB helper functions (mock sqlite).
5. **APK build & distribution**

   * Build Android APK via `eas build -p android --profile preview` or `expo build:android` (if using classic).
   * Provide APK to librarians for install.
6. **Training & SOP**

   * Create 1-page SOP (shift start/sync/borrow/return/end shift).
   * Run 20–30 minute hands-on session with librarians.

### Acceptance

* App installed and used by one librarian for a full day without data loss.
* Sync works and admin can view consolidated data in Supabase dashboard.

---

## Deliverables (per phase)

* **Phase 0**: Git repo skeleton, Expo app runs, SQLite tables created, Supabase project set up.
* **Phase 1**: Working Book/User registration, QR generation, scanner borrow/return, local DB CRUD, Reports screen.
* **Phase 2**: Sync implementation to Supabase, conflict UI, multi-device test logs.
* **Phase 3**: APK, SOP, training session, backups, final trial with librarians.

---

## Suggested Task Breakdown & Priority (first 2 weeks)

1. Day 1–2: Repo, Expo init, SQLite init, Supabase skeleton. (Phase 0)
2. Day 3–6: RegisterBook + QR generation + local save. (Phase 1)
3. Day 7–10: RegisterUser (Fayda scan) + scanner borrow/return flows. (Phase 1)
4. Day 11–14: Reports + local search + small UI polish. (Phase 1)
5. After initial MVP: implement basic sync and testing cycles. (Phase 2)

> (If you prefer, I can convert this into a Trello/Notion task list with checkboxes.)

---

## Testing checklist (what to verify before handing to librarians)

* [ ] App opens and shows Dashboard.
* [ ] Register book → QR generated → saved to gallery.
* [ ] Register user via Fayda barcode.
* [ ] Borrow flow works offline and registers transaction.
* [ ] Return flow marks return properly.
* [ ] Reports reflect transactions correctly.
* [ ] Export/import backup works.
* [ ] Sync uploads pending TXs and marks them as synced.
* [ ] Conflict scenario triggers admin review.

---

## Quick starter code suggestions (where to begin coding)

* `src/database/init.ts` — create and export `db` instance and table create statements.
* `src/database/db.ts` — implement `addBook()`, `addUser()`, `borrowBook()`, `returnBook()`, `listPendingTransactions()`.
* `src/screens/RegisterBook.tsx` — form + call `db.addBook()` + QR generation.
* `src/screens/Scanner.tsx` — barcode scanner with mode toggle + calls to `db.borrowBook()` / `db.returnBook()`.
* `src/services/syncService.ts` — `syncNow()` skeleton that collects pending records and logs the server response.

---
