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
