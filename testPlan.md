Nice — below is a **final, exhaustive test plan** with **step-by-step test cases** (inputs → exact expected outputs) for **both Admin** and **Librarian** flows, starting from **first-time install** through day-to-day use, including offline behavior, sync, edge cases and failure modes. I inspected your code and wiring (files you shared + behavior you described) and used that to produce concrete test inputs and exact expected outputs. Run these manually or use them as a basis for automated tests.

Each test case includes:

* Preconditions (what must be true before running the test)
* Steps (what to do)
* Inputs (form fields, QR payloads, etc.)
* Expected outputs (UI messages, DB rows/fields, commits created, redirects)
* Postconditions / Cleanup
* Notes where relevant (file or function to check)

I split the plan into two main flows: Admin (device activation + admin tasks) and Librarian (daily offline-first work). At the end I provide a short **priority checklist** (critical tests to run first).

# Admin — Full test suite (install → activation → admin day-to-day)

> Goal: ensure an admin can activate a device, set PIN, manage librarians/devices, run sync, and review commits.

## A0 — Fresh install (first run)

Preconditions: App not installed / DB empty.
Steps & Inputs:

1. Launch app.
   Expected outputs:

* App runs `initDb()` on mount (app/_layout.tsx). DB created with tables from db/schema and migrations. No crash.
* UI: redirected to `/auth/bootstrap` or `/auth/login-cloud` (bootstrap shown). (See app/auth/bootstrap.tsx)
  Postconditions:
* `meta` table exists (db.applySnapshot will create in activation).
  Notes: check sqlite file & tables.

---

## A1 — Admin activation (cloud) — happy path

Preconditions: Device online, admin credentials provided by server.
Steps & Inputs:

1. Open `Activate Device` screen (app/auth/login-cloud.tsx).
2. Enter username: `DiguwaSoft` and PIN: `1366` (per mocked network.ts behaviour) or admin credentials in real server.
3. Press “Activate Device”.
   Expected outputs:

* network.postActivate returns ok with snapshot and role `admin`. (lib/network.ts mock)
* applySnapshot(...) invoked and writes snapshot into local tables. (lib/activation.ts)
* `meta.device_id` saved to meta table
* After activation, if `require_pin_change` false, app routes to admin dashboard `/admin` (or `/home` with admin button). If `require_pin_change` true, redirect `/auth/change-pin?username=...`.
  Check:
* DB: books, users, librarians rows inserted per snapshot. commits table has activation commit (commit-activation-...).
* UI: redirect to admin page.

Edge / Failure cases:

* If network returns { ok: false }, UI shows Alert "Activation Failed" with reason. No DB writes.

---

## A2 — Admin sets initial PIN (if required)

Preconditions: Activation returned `require_pin_change = true` or admin chooses to change PIN.
Steps & Inputs:

1. On `/auth/change-pin?username=lib1` screen, enter:

   * Old/temporary PIN: `0000` (server-provided)
   * New PIN: `4321`
   * Confirm: `4321`
2. Tap Set New PIN.
   Expected outputs:

* runAsync SELECT pin_salt/pin_hash for username → returns a record.
* verify old PIN via verifyPinHash (lib/authUtils.ts) — must pass.
* New salt generated (generateSalt) and new hash stored to librarians table via `UPDATE librarians ...`.
* UI: Alert "Success, PIN changed successfully." and redirects to `/` (app/auth/change-pin.tsx).
  Check DB:
* librarians.pin_salt and pin_hash updated.
  Edge cases:
* if old PIN not correct → alert "Invalid PIN" and do not update.
* newPin < 4 digits → validation error.

---

## A3 — Admin login (offline)

Preconditions: Admin exists in local librarians table with pin_salt/pin_hash set and device_id matching meta.device_id (or device_id null).
Steps & Inputs:

1. Open `/auth/login` (app/auth/login.tsx).
2. Enter username: `DiguwaSoft` and PIN: the set PIN.
3. Tap Login.
   Expected outputs:

* `getLibrarianByUsername(username)` returns user.
* device binding check: if user.device_id exists compare with meta.device_id from `getMetaValue`, otherwise allow.
* verifyPinHash(pin, user.pin_salt, user.pin_hash) returns true.
* saveSession( { username, role, loggedInAt } ) saved to SecureStore (lib/session.ts).
* Redirect: role admin -> `/admin` or `/home`.
  Check:
* SecureStore contains `session` JSON with keys: username, role, loggedInAt.
  Edge cases:
* Wrong pin → Alert "Invalid PIN".
* user device_id mismatch → Alert "Device Mismatch".

---

## A4 — Admin: Add librarian (admin UI)

Preconditions: admin logged in.
Steps & Inputs:

1. Navigate to Admin → Librarians → Add (app/admin/librarians/add.tsx).
2. Fill fields: username: `lib2`, role: `librarian`, generate temporary PIN `0000` (as per server or admin sets).
3. Submit.
   Expected outputs:

* Insert into librarians table with username, pin_salt/pin_hash (if created locally) or with placeholders so activation can force PIN change.
* A pending commit for insert librarian is created — either via commits API in admin UI (db/commits or pending_commits creation).
* UI: success message, newly listed librarian appears.
  Check DB:
* new librarians row (username=lib2) present; if using server, watch commit queue.
  Edge cases:
* duplicate username → error.

---

## A5 — Admin: View pending commits & sync

Preconditions: Several pending commits exist (from local admin changes or device activations).
Steps & Inputs:

1. Navigate Admin → Commits (app/admin/commits/index.tsx).
2. Press Sync Now (or admin sync screen).
   Expected outputs:

* Sync engine (`lib/syncEngine.ts`) collects pending commits from `pending_commits` table (db/queries/commits.ts getPendingCommits).
* Pushes commits to server (in mock mode, simulate success).
* On success, `markCommitAsSynced(id)` called → pending_commits.synced = 1.
* Pull snapshot → applySnapshot or local merges.
* addSyncLog entry created in `sync_log` table (db/syncLog.ts addSyncLog).
  UI:
* Sync progress seen, final success message and sync log entries visible.

Edge cases:

* Network failure → sync aborted, pending_commits remain with synced=0. Sync log saved with status=failure.

---

## A6 — Admin: Device binding/unbinding

Preconditions: Admin manages device assignments.
Steps & Inputs:

1. In Admin → Devices select device and bind/unbind a librarian.
   Expected outputs:

* `devices` table updated (db/queries/devices.ts).
* Commit generated for device binding.
* UI shows updated binding.

---

## A7 — Admin: Reports & dashboards

Preconditions: data present (books, users, transactions).
Steps:

1. View admin analytics and dashboard pages.
   Expected:

* getDashboardStats returns counts matching DB (db/dashboard.ts).
* Charts/summary render placeholders. Buttons navigate as expected.

---

# Librarian — Full test suite (install → offline workflows)

> Goal: ensure a librarian can work offline-first: borrow, return, scan, manage users/books locally, create commits, manually sync later.

## B0 — Fresh install for librarian (activation via cloud or pre-seeded)

Preconditions:

* Either activated by admin via cloud (login-cloud) OR librarian seeded by admin snapshot.
  Steps & Inputs:

1. Launch app → if no session, go to `/auth/login`.
2. Login using `lib1` with PIN `0000` or set PIN.
   Expected outputs:

* If device is not activated, admin must have applied snapshot. Otherwise login fails.
* After set PIN or login, session saved (SecureStore). UI shows Home Dashboard `/home` or `/librarian` (app/home/index.tsx / app/librarian/index.tsx).
  Check:
* getSession returns object. (lib/session.ts)

---

## B1 — Librarian: View Dashboard (local stats)

Preconditions: DB contains books/users/transactions snapshot.
Steps:

1. Open home dashboard.
   Expected outputs:

* getDashboardStats() returns correct numbers: totalBooks, totalUsers, activeBorrows, availableCopies, returnedToday, overdueCount (db/dashboard.ts).
* Buttons visible: Borrow, Return, Books, Users, Transactions, Inventory, Shifts, Attendance.

---

## B2 — Borrow flow — happy path (offline)

Preconditions:

* Book exists with copies >=1 (book.book_code = `book-1`, copies = 3)
* User exists (fayda_id `user-1`)
  Steps & Inputs:

1. Home → Borrow → Scan Book (app/borrow/scan-book.tsx).

   * Camera scans QR with payload `book-1`.
2. Next → Scan User (app/borrow/scan-user.tsx).

   * Camera scans QR / manual enter `user-1`.
3. Confirm Borrow (app/borrow/confirm.tsx).

   * Tap Confirm.
     Expected outputs (in order):

* getUser(book.fayda_id) returns user -> UI shows user details (db/users.ts getUser).
* getBook(book_code) returns book -> UI shows book details (db/books.ts getBook).
* getActiveBorrow(user, book_code) returns null before borrow.
* borrowBook(fayda_id, book_code) in db/transactions.ts runs:

  * Inserts into `transactions` with tx_id, book_code, fayda_id, borrowed_at, device_id (pulled from librarian?.device_id or "unknown-device"), sync_status = 'pending'.
  * Updates `books.copies` decrement by 1 and updated_at set to now.
  * Calls appendCommit (readable commit for admin UI).
  * Calls addCommit("insert", "transactions", {tx_id, fayda_id, book_code, borrowed_at: now}).
* Return from borrowBook: tx_id returned to caller.
* UI: Alert "Success — Book Borrowed Successfully!" and redirect to /transactions (as coded).
* Events emitted: refresh-dashboard, refresh-books, refresh-transactions (utils/events).
  DB checks:
* New row in `transactions` for tx_id with returned_at = NULL and sync_status = 'pending'.
* books.copies decreased by 1.
* A pending commit added to `pending_commits` table with action 'insert' table_name 'transactions', payload JSON includes tx_id etc. (db/queries/commits.getPendingCommits).
  Edge cases:
* If book.copies < 1 → borrowBook throws Error("No copies available.") and UI should show error. (db/transactions.ts)
* If active borrow exists → error "User already borrowed this book..."

---

## B3 — Confirm pending commit for updating book copies (FIX 3)

This is critical: whenever books.copies updated, we must also create a commit for "update" on books. You asked where to add it — in the code paths that update books.copies (borrowBook and completeReturn).
Test inputs:

* After a borrow action (B2), check pending_commits includes:

  * An insert commit for transactions.
  * **An update commit for books** with payload { book_code, copies: newCopies, updated_at: now }.
    Expected behavior:
* A pending commit inserted after `UPDATE books SET copies = copies - 1...` call.
  Where to check in code:
* Add `await addCommit("update", "books", { book_code, copies: newCopies, updated_at: now });` immediately after the db.runAsync updating books in borrowBook and in completeReturn after incrementing copies.
  Test:
* After borrow, fetch pending_commits → should see both commits. After implementing fix, this test must pass.

---

## B4 — Return flow — happy path (offline)

Preconditions:

* Active transaction exists: transactions row with returned_at = NULL for `user-1` & `book-1`.
  Steps & Inputs:

1. Home → Return → Scan Book → Scan User → Confirm Return
2. Confirm
   Expected outputs:

* getActiveBorrow returns transaction record
* completeReturn(tx_id) in db/transactions.ts runs:

  * Updates `transactions` returned_at = now and sync_status = 'pending' (runAsync).
  * Updates `books.copies = copies + 1` and updated_at = now.
  * Calls appendCommit({ type: 'return_book', payload: { book_code, fayda_id }}) — admin-readable commit.
  * After implementing FIX 3, also `addCommit("update", "books", { book_code, copies: newCopies, updated_at: now })`.
* UI: Alert "Success — Book Returned Successfully!" and redirect to /transactions.
* Events emitted: refresh-dashboard and refresh-transactions.
  DB checks:
* transactions.returned_at not null, sync_status 'pending'.
* books.copies increased by 1.
* pending_commits contains update for transaction and update for books.

Edge cases:

* If activeBorrow not found → UI shows "Not Borrowed".

---

## B5 — Transactions listing & history

Preconditions: Some transactions exist (active and returned).
Steps:

1. Go to /transactions or /transactions/history/[fayda_id]
   Expected outputs:

* getAllTransactions(), getActiveTransactions(), getReturnedTransactions() return correct SQL joined results (db/transactions.ts).
* Borrowed_at / returned_at displayed; Status badge shows ACTIVE/RETURNED per returned_at presence.

---

## B6 — Users module: Add / Update User (offline)

Preconditions: logged in librarian
Steps & Inputs:

1. Create a new user in /users/register with inputs:

   * fayda_id: `FD-1002`, name: `Eleni T`
2. Submit.
   Expected outputs:

* upsertUser writes to users table with sync_status = 'pending' (db/users.upsertUser).
* A commit created: addCommit("insert", "users", payload).
* events.emit("refresh-users") so UI updates.
  DB checks:
* users row with fayda_id exists and sync_status 'pending'.
  Edge cases:
* Duplicate fayda_id → upsert updates and sets sync_status 'pending'.

---

## B7 — Shifts & Attendance (clock-in/out)

Preconditions:

* Shifts exist for today assigned to the logged-in librarian.
  Steps & Inputs:

1. Open /librarian/shifts/index.tsx. For a shift without attendance, code auto-creates record via createAttendanceRecord(shift.id, username).
2. Tap Clock In (calls clockIn).
3. Wait / work.
4. Tap Clock Out (calls clockOut).
   Expected outputs:

* On load: if no attendance for shift, `createAttendanceRecord` inserts attendance row with status 'not_started' and creates pending commit `addCommit("insert", "attendance", attendanceRow)` (your previous fix added these).
* clockIn updates attendance.clock_in = now and status 'in_progress'; creates a pending commit addCommit("update", "attendance", {id, clock_in, status:'in_progress'}).
* clockOut updates clock_out and status 'completed'; pending commit added for update.
* UI status pill shows Not Started -> In Progress -> Completed transitions.
* events.emit("refresh-attendance") triggers reload.
  DB checks:
* attendance rows with clock_in/clock_out values set and sync_status pending.
  Edge cases:
* ClockOut without ClockIn should be disallowed in UI or results in acceptance but clock_in null; system should still record clock_out and set status completed — test both.

---

## B8 — Offline multiple actions then sync

Preconditions:

* Device offline (simulate airplane mode).
  Steps:

1. Perform actions offline:

   * Add 2 users
   * Register 1 book
   * Borrow 3 books
   * Return 1 book
   * Clock in/out for a shift
2. Confirm each action created pending_commits rows with synced = 0 and appropriate payloads (insert/update actions).
3. Go to Sync Control and press Sync Now (simulate network back online).
   Expected outputs:

* Sync engine reads pending_commits in ascending order and pushes to server (lib/syncEngine.ts).
* For each commit: on success markCommitAsSynced sets synced = 1.
* After push, sync engine pulls latest snapshot and applies changes (applySnapshot), merges or overwrites local rows per server authority.
* addSyncLog row inserted with status 'success' and device_id set.
* UI: success message & events refresh-dash/transactions/books.
  DB checks:
* all pending_commits now show synced = 1.
  Edge cases:
* If server rejects a commit, that commit remains synced=0, sync log records failure, and UI shows which commit failed.

---

## B9 — Conflict test: local edit vs server updated row

Preconditions:

* A book's title modified on server after snapshot.
* Locally, librarian edits same book while offline.
  Steps:

1. Locally edit book.title → add commit update books.
2. Server also has changed book.title differently.
3. Perform sync (push then pull).
   Expected outputs:

* According to architecture, server is source of truth. After pushing pending commits, pull snapshot will apply server state; conflicts resolved by timestamps: server's updated_at overrides local if server newer. If local change has newer timestamp, server may accept it based on server logic. (Document: Rule #5 Server is source of truth).
* DB final book.title consistent with snapshot pulled.
  Test expectations:
* Confirm which field survived (documented conflict behavior). If you want last-wins by timestamp, ensure server supports it.

---

## B10 — Session expiration & Logout

Preconditions: Session stored in SecureStore with loggedInAt older than 12 hours.
Steps:

1. On app index mount (app/index.tsx), simulate session_loggedInAt older than 12h.
   Expected outputs:

* App clears session via clearSession() and routes to /auth/login (app/index.tsx checks age > 12 hours).
* Logout flow: call logout() (lib/logout.ts) clears session.
  Edge case:
* Account deleted locally: getLibrarianByUsername returns undefined -> app clears session.

---

## B11 — Camera permission denial & recovery

Steps:

1. Open scan-book or scan-user screens without camera permission.
2. Deny permission prompt.
   Expected outputs:

* UI shows Grant Camera Permission button; scanning not possible.
* On pressing Grant and granting permission, camera view is available and scanning works.

---

## B12 — QR saving to gallery (book register / details)

Preconditions: created book with QR
Steps & Inputs:

1. On created-book state (app/books/register.tsx) or book details, tap Save QR to Gallery.
2. Permissions flow: request MediaLibrary permission.
   Expected outputs:

* If permission granted and device supports saving, file saved to device album "Church Library" or gallery.
* UI alert "QR code saved to gallery!"
  Edge cases:
* Permissions denied → show Alert to request permissions.

---

## B13 — Reports generation & printing

Steps:

1. From Home → Print Report
   Expected outputs:

* Reports generate (reports/generate.ts) and present or prepare file to print.
* No crash.

---

# Cross-cutting & Negative tests

## C1 — Database errors

Simulate a failing SQL write (e.g., by injecting invalid SQL).
Expected:

* Code catches errors and shows Alert rather than crash. Example: try/catch around runAsync calls.

## C2 — Duplicate commit creation check

Perform same action twice (e.g., press Confirm Borrow twice quickly).
Expected:

* UI prevents double-submit (processing flag), and database should prevent duplicate transactions by tx_id uniqueness; if duplicates occur, app handles gracefully and only one commit created.

## C3 — Large offline queue stress test

* Create 50 commits offline (mix of inserts and updates).
  Expected:
* Sync engine pushes all in order; no memory crash; sync_log records success.

---

# Files & functions to inspect when tests fail (quick map)

* Session & auth: lib/session.ts, lib/authUtils.ts, app/auth/login.tsx, app/auth/change-pin.tsx
* Activation: lib/activation.ts, lib/network.ts (mock behavior)
* Commit / sync: db/commits.ts, db/queries/commits.ts, lib/syncEngine.ts, db/syncLog.ts
* Borrow/Return logic: db/transactions.ts (borrowBook(), completeReturn()) — make sure both update books.copies and **add commit for books updates** (your FIX 3).
* Books CRUD: db/books.ts (addBook(), markBooksSynced())
* Users CRUD: db/users.ts (upsertUser(), updateUser())
* Shifts & attendance: db/queries/shifts.ts, db/queries/attendance.ts (createAttendanceRecord(), clockIn(), clockOut()) — ensure they call addCommit for insert/update.
* Dashboard stats: db/dashboard.ts
* UI wiring: app/borrow/*, app/return/*, app/books/*, app/librarian/shifts/*

---

# Priority checklist — run these first (order matters)

1. Fresh install (A0), activation (A1) happy path. Verify applySnapshot wrote DB rows.
2. Admin login offline (A3). Verify SecureStore session.
3. Borrow happy path offline (B2) — verify `transactions` row, `books.copies` decreased, **pending_commits includes both transaction insert and books update** (FIX 3).
4. Return happy path offline (B4) — verify `transactions.returned_at`, `books.copies` increased, and commits created.
5. Shifts & Attendance (B7) — confirm attendance insert and update commits.
6. Offline actions queue then Sync (B8) — create a mix of commits offline and do Sync Now; verify pending_commits marked synced and sync_log created.
7. Device binding & login mismatch (A3) — attempt login with mismatched device_id and expect device mismatch alert.
8. Edge: borrow book with 0 copies (B2 edge).
9. Camera permission denial & re-grant (B11).
10. Session expiry behavior (B10).

---

# Concrete example test case format (copyable for test runner)

Below is one full, concrete test case in a format you can import into a test-runner or checklist:

Test ID: LIB-BORROW-001
Title: Borrow a book offline (happy path)
Preconditions:

* Device initialized and session for `lib1` stored.
* Book row exists: book_code=`book-1`, copies=`3`.
* User row exists: fayda_id=`user-1`.
  Steps:

1. Launch app → Home.
2. Tap Borrow → Scan Book → scan QR `book-1`.
3. Tap Next → Scan User → scan QR `user-1`.
4. Tap Confirm.
   Inputs:

* book_code: `book-1`
* fayda_id: `user-1`
  Expected outputs (precise):
* DB: `transactions` table has new row with fields:

  * tx_id: non-empty UUID
  * book_code: `book-1`
  * fayda_id: `user-1`
  * borrowed_at: ISO timestamp (approx now)
  * returned_at: NULL
  * device_id: value from librarian?.device_id or `unknown-device`
  * sync_status: `'pending'`
* DB: `books` table row where book_code=`book-1` has copies == 2 (3 - 1)
* DB: `pending_commits` contains:

  1. Insert commit for `transactions` with payload includes tx_id/book_code/fayda_id/borrowed_at, synced=0
  2. Update commit for `books` with payload { book_code:'book-1', copies:2, updated_at: `<ISO>`, } synced=0
* UI: Alert shown "Success — Book Borrowed Successfully!" and redirect to `/transactions`.
* Events: refresh-dashboard, refresh-books emitted (you can inspect events bus or that UI refreshed counts).

Postconditions:

* Pending commits queue length increased by 2.

---

# Final notes & recommended fixes (based on code review)

1. **FIX 3 (books update commit)**: Ensure you add `addCommit("update","books", {...})` wherever you change `books.copies` (both borrowBook and completeReturn). Without this, sync will not update server copies.
2. Types & null-safety: ensure `librarian.pin_salt`/`pin_hash` types are non-nullable or guard before passing to verifyPinHash (fixes TypeScript errors you reported).
3. Session payload: SessionPayload definition currently lacks device_id — but you used device_id elsewhere. If you want session to include `device_id`, add to SessionPayload type and to saveSession calls — otherwise consistently read device from meta table.
4. Ensure `createAttendanceRecord` uses `addCommit` for insert and updates.

---

If you want, I can:

* Convert this whole test suite into a CSV/Google Sheet test matrix.
* Generate Postman-like JSON fixtures for mock server responses used in activation/sync tests.
* Produce a short automated test outline (jest + mocked sqlite) to run key flows.

Which one shall I produce next?
