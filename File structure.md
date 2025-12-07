# 📁 **Final File & Folder Structure (Expo + RN + SQLite + Supabase)**

This is the recommended production-ready structure:

```
/church-library-app
│
├── app/                         # Expo Router screens
│   ├── _layout.tsx              # Root navigator
│   ├── index.tsx                # Dashboard
│   ├── scan/
│   │   ├── borrow.tsx           # Scan user ID + book
│   │   ├── return.tsx           # Scan book return
│   ├── books/
│   │   ├── index.tsx            # Books list
│   │   ├── register.tsx         # Register new book + QR generator
│   │   ├── [book_code].tsx      # Book detail
│   ├── users/
│   │   ├── index.tsx            # Users list (optional MVP)
│   │   ├── register.tsx         # Register new user
│   │   ├── [fayda_id].tsx       # User detail
│   ├── reports/
│   │   ├── index.tsx            # Reports home
│   │   ├── overdue.tsx          # Unreturned books
│   │   ├── top-books.tsx        # Top borrowed books
│   │   ├── top-readers.tsx      # Top readers
│   ├── sync/
│   │   ├── index.tsx            # Manual sync screen
│   │   ├── logs.tsx             # Sync logs
│
├── components/                  # Shared UI components
│   ├── BookCard.tsx
│   ├── UserCard.tsx
│   ├── Scanner.tsx              # Reusable scanner component
│   ├── QRGenerator.tsx
│   ├── Loading.tsx
│   ├── EmptyState.tsx
│
├── db/
│   ├── schema.ts                # SQL CREATE TABLE scripts
│   ├── sqlite.ts                # SQLite instance + initDb()
│   ├── books.ts                 # CRUD for books
│   ├── users.ts                 # CRUD for users
│   ├── transactions.ts          # CRUD for borrow/return
│   ├── syncLog.ts               # CRUD for sync logs
│
├── lib/
│   ├── supabase.ts              # Supabase client setup
│   ├── sync.ts                  # Full sync logic (upload + download)
│   ├── generateId.ts            # UUID generator
│   ├── time.ts                  # Date/time utils (for timestamps)
│   ├── validation.ts            # Input validators
│
├── hooks/
│   ├── useBooks.ts              # Query books (local)
│   ├── useUsers.ts              # Query users
│   ├── useTransactions.ts       # Borrow/Return logic
│   ├── useSync.ts               # Auto-sync hook
│
├── context/
│   ├── SyncContext.tsx          # Sync state (pending, syncing)
│   ├── DeviceContext.tsx        # Device ID & settings
│
├── assets/
│   ├── icons/
│   ├── images/
│   ├── qr/                      # Saved QR images (optional)
│
├── utils/
│   ├── camera.ts                # Camera settings/permissions
│   ├── scanner.ts               # Scanner helpers
│   ├── file.ts                  # Save QR to gallery
│
├── constants/
│   ├── app.ts                   # Default settings (sync interval, etc.)
│   ├── colors.ts
│   ├── categories.ts            # Book categories list
│
├── App.tsx                      # Entry point (Expo)
├── package.json
└── tsconfig.json
```
 
# ✅ **1. HIGH-LEVEL UNDERSTANDING — YES, I fully remember the project**

You are building a **full offline-first church library management system** with:

* Librarian & Admin roles
* Books, Users, Borrow/Return
* Attendance & Shifts
* Device Binding
* Commit-based offline sync
* SQLite local database
* Manual & Auto Sync
* Secure Session with PIN
* QR-based borrow/return
* Full reporting

All **reads come from SQLite**.
All **writes create commits**.
Sync pushes commits to server → pulls snapshot.

I still have the full flow in memory.

---

# ✅ **2. FULL FILE-BY-FILE FUNCTION MAP + WIRING DESIGN**

Below is a structured breakdown by folder, with **purpose**, **which components talk to which**, and **what DB tables and lib functions each screen uses**.

---

# 📁 **ROOT LEVEL FILES**

(General configuration)

| File          | Purpose                                                                |
| ------------- | ---------------------------------------------------------------------- |
| App.tsx       | Entry point → loads session → router → global providers (theme, toast) |
| app.json      | Expo metadata                                                          |
| package.json  | Dependencies                                                           |
| tsconfig.json | TypeScript setup                                                       |
| .env          | Server base URLs, API keys                                             |
| README.md     | Project explanation                                                    |
| eas.json      | Expo EAS build config                                                  |

No logic here — just config.

---

# 📁 **APP ROUTER**

## **app/_layout.tsx**

* Provides navigation shell
* Protects routes based on session
* Decides between:

  * `/auth/*`
  * `/home`
  * `/admin`

**Wires:**
`secureSession.getSession()` → navigation decision.

---

# 📁 **auth (Authentication & Activation)**

### **auth/bootstrap.tsx**

* Checks device activation state
* Redirects:

  * not activated → `/auth/activate`
  * activated but no user → `/auth/login`
  * has session → home

### **auth/login.tsx**

* Offline login (username + PIN)
* Uses:

  * `db/auth.getLibrarianByUsername()`
  * `authUtils.verifyPin()`
  * `secureSession.saveSession()`

### **auth/login-cloud.tsx**

* (Optional) cloud login
* Used for admin rebind scenario

### **auth/change-pin.tsx**

* Change default PIN during activation
* Uses:

  * `authUtils.hashPin`
  * `db/librarians.updatePin`

---

# 📁 **lib (Core logic layer)**

This is the **ENGINE ROOM** of the system.

### **lib/session.ts**

* Load/parse session
* Expiry checking
* Attach role & device_id

### **lib/secureSession.ts**

* Secure store wrapper
* Stores encrypted session in device secure storage

### **lib/authUtils.ts**

* Hash PIN
* Verify PIN
* Random salt generator
* Time-safe comparisons

### **lib/network.ts**

* Check internet availability
* Retry wrapper

### **lib/activation.ts**

* Device activation handshake
* Receives snapshot from server
* Calls `migrations.applySnapshot()` → inserts all DB data
* Creates admin/librarian local account
* Saves device meta

### **lib/syncEngine.ts**

This is CRITICAL.

Contains:

* `pushCommits()`
* `pullSnapshot()`
* `fullSync()`
* Conflict resolution
* Commit marking

Uses:

* `db/commits.getPendingCommits()`
* `db/commits.markSynced()`
* `db/migrations.applySnapshot()`

**This wires:**
UI → syncEngine → DB → server API

---

# 📁 **db (Data Layer / SQLite)**

All tables & queries for local-first operations.

### **db/sqlite.ts**

* Creates database
* Runs migrations
* Exposes query executor

### **db/schema.ts**

Defines tables:

* books
* users
* transactions
* attendance
* shifts
* librarians
* devices
* meta
* pending_commits
* sync_log

### **db/migrations.ts**

* Applies schema migrations
* Applies full snapshots (wipe & rebuild)
* Ensures schema consistency

---

## **db modules (CRUD)**

### **db/auth.ts**

* getLibrarianByUsername
* updatePin
* validate device binding

### **db/books.ts**

* addBook
* updateBook
* incrementCopies
* decrementCopies
* getBookByCode
* listBooks

### **db/users.ts**

* addUser
* updateUser
* listUsers
* getUser

### **db/transactions.ts**

* borrowBook
* returnBook
* getBorrowHistory
* listTransactions

### **db/dashboard.ts**

* stats for home page
* overdue count
* active borrow count

### **db/commits.ts**

* addCommit
* getPendingCommits
* markSynced
* bulkInsert from snapshot

### **db/shifts.ts**

* createShift
* updateShift
* deleteShift
* listShifts

### **db/devices.ts**

* local device metadata
* activation flags

### **db/attendance.ts**

* createAttendance
* updateClockIn
* updateClockOut
* getTodayAttendance

### **db/syncLog.ts**

* record sync attempt
* display in admin/sync page

---

# 📁 **app/home/index.tsx**

**Dashboard for librarians**

Uses:

* `db/dashboard.getStats()`
* `session.role` (to show admin button)
* Navigation to modules
* Attendance auto-start logic

---

# 📁 **BOOK MODULE (app/books)**

### **books/register.tsx**

* Register a book
* QR preview
* Writes:

  * `db/books.addBook`
  * `addCommit("insert","books",...)`

### **books/list.tsx**

* Search + list of books
* Pure SQLite

### **books/inventory.tsx**

* Shows real-time copies available

### **books/[code].tsx**

* Book detail
* Show QR
* Show borrow history link

### **books/history/[book_code].tsx**

* All transactions for this book

### **books/scan.tsx**

* QR scanner → book code → redirect

---

# 📁 **USERS MODULE (app/users)**

### **users/register.tsx**

* Add a user
* Commit created

### **users/list.tsx**

* Search local users

### **users/scan.tsx**

* Fayda ID QR scanner

### **users/[fayda_id].tsx**

* User detail
* Active borrows
* Personal info

### **users/edit/[fayda_id].tsx**

* Update user
* Commit created

---

# 📁 **BORROW FLOW (app/borrow)**

**Borrow Flow = scan book → scan user → confirm → commit**

### **borrow/scan-book.tsx**

* Scan book QR

### **borrow/scan-user.tsx**

* Scan user QR

### **borrow/index.tsx**

* Book + User summary
* Check availability
* Continue → confirm

### **borrow/confirm.tsx**

* Writes:

  * insert transaction
  * decrement book.copies
  * commit for both

---

# 📁 **RETURN FLOW (app/return)**

Mirror of borrow.

### **return/scan-book.tsx**

* Scan book QR

### **return/scan-user.tsx**

* Scan user QR

### **return/index.tsx**

* Validate active transaction

### **return/confirm.tsx**

* Writes:

  * update transaction.returned_at
  * increment book.copies
  * commit for both

---

# 📁 **TRANSACTIONS MODULE**

### **transactions/index.tsx**

* List of all transactions
* Filters:

  * Active
  * Returned
  * Overdue

### **transactions/history/[fayda_id].tsx**

* User's full history

---

# 📁 **ATTENDANCE & SHIFTS**

### **librarian/shifts/index.tsx**

* List shifts assigned to librarian

### **librarian/shifts/history.tsx**

* Attendance log for librarian

### **admin/shifts/index.tsx**

* List all shifts (admin only)

### **admin/shifts/create.tsx**

* Create shift
* Commit created

### **admin/shifts/edit/[id].tsx**

* Edit shift
* Commit created

---

# 📁 **ADMIN PANEL (app/admin)**

### **admin/index.tsx**

* Admin dashboard
* Buttons for:

  * librarians
  * shifts
  * commits
  * sync
  * devices
  * analytics

### **admin/librarians/index.tsx**

* List librarians

### **admin/librarians/add.tsx**

* Add librarian
* Commit created

### **admin/librarians/[id].tsx**

* Edit librarian
* Reset PIN
* Unbind device

### **admin/devices/index.tsx**

* Show current device
* Activation status

### **admin/commits/index.tsx**

* View pending commits
* View synced commits

### **admin/sync/index.tsx**

* Manual sync page
* Logs from `syncLog`

---

# 📁 **reports/**

* Generate PDF/CSV monthly reports
* For admin

---

# 📁 **utils/**

### **utils/events.ts**

* EventEmitter for live UI updates

### **utils/uploadImage.ts**

* Uploads ID photos or book covers

---

# 📁 **components/**

Reusable UI components

* BookCard
* PhotoPicker

---

# 📁 **reports/generate.ts**

* Export data into CSV or PDF
* Uses purely SQLite

---

# 🚀 **3. WIRED SYSTEM DESIGN (SUMMARY)**

Here is how the entire system is connected:

---

## **UI Layer (Screens in /app)**

⬇
**Logic Layer (lib folder)**

* session
* auth
* syncEngine
  ⬇
  **Data Layer (db folder - SQLite CRUD)**
  ⬇
  **Commit Layer (db/commits.ts)**
  ⬇
  **Sync Layer (syncEngine.ts → server)**
  ⬇
  **Server REST API (remote)**
  ⬇
  **Snapshot → db/migrations.applySnapshot**
  ⬆
  **Write records to SQLite**

---

Every module in UI calls a function from **lib or db**:

* Borrow/Return → db/transactions + commits
* Books → db/books + commits
* Users → db/users + commits
* Shifts → db/shifts + commits
* Attendance → db/attendance + commits
* Admin sync → syncEngine
* Login → authUtils + db/auth
* Activation → activation.ts + migrations
 