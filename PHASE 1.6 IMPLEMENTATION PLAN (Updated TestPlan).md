

# 🚀 **PHASE 1.6 — IMPLEMENTATION PLAN (Updated TestPlan)**

## 🌐 **Objective**

Enable TRUE multi-device real-time syncing using:

* **Supabase Postgres** as the central database
* **Supabase Edge Functions** as the server API (`/auth/activate`, `/api/sync/push`, `/api/sync/pull`)
* **Expo App** connected via `EXPO_PUBLIC_ONLINE_MODE=true`

This phase replaces the mocked/offline behavior with a fully working cloud backend.

---

# 🏗️ **Step 1 — Supabase Cloud Setup**

### 1.1 Create new Supabase project

Use free tier.

### 1.2 Database Tables Required

Match local SQLite structure EXACTLY:

### **Tables to create**

1. **librarians**
2. **books**
3. **users**
4. **transactions**
5. **pending_commits**
6. **commits**
7. **devices (optional future)**

You will get the SQL schema from local DB (I can generate full SQL if needed).

---

# 🧩 **Step 2 — Build Cloud API (Supabase Edge Functions)**

We need THREE endpoints:

## **API 1 — `POST /auth/activate`**

Input:

```json
{ "username": "xx", "pin": "xxxx", "device_id": "android-xxxxx" }
```

Output:

```json
{
  "ok": true,
  "role": "admin",
  "require_pin_change": true,
  "snapshot": { … },
  "last_pulled_commit": "commit-id"
}
```

### Logic:

1. Find librarian
2. Compare PIN (server stored hashes)
3. Bind device (`device_id` update)
4. Generate full snapshot
5. Force PIN change for temporary PINs
6. Return snapshot

---

## **API 2 — `POST /api/sync/push`**

Input:

```json
{
  "device_id": "xxx",
  "commits": [
    { "id": 5, "table": "books", "action": "update", "payload": {…}, "timestamp": "…" }
  ]
}
```

Server behavior:

* Apply commits table-by-table
* Update server DB
* Add commit to server-side `commits` table
* Return pushedIds

Output:

```json
{ "ok": true, "pushedIds": [5] }
```

---

## **API 3 — `POST /api/sync/pull`**

Input:

```json
{ "device_id": "xxx", "last_pulled_commit": "commit-123" }
```

Server behavior:

* Determine what changed since last pulled commit
* Return snapshot
* Provide new `last_pulled_commit`

Output:

```json
{ "ok": true, "snapshot": {...}, "serverTime": "..." }
```

---

# ⚙️ **Step 3 — Expo Client Configuration**

## 3.1 Add `.env.production`

```
EXPO_PUBLIC_ONLINE_MODE=true
EXPO_PUBLIC_API_BASE_URL=https://YOUR-NETLIFY-OR-SUPABASE-FUNCTION-URL
```

## 3.2 Change network.ts to use cloud endpoints

You already did correct preparation.

---

# 📱 **Step 4 — Two-Device Cloud Testing Setup**

This is EXACTLY what we will validate:

## 🚨 **Goal: Two devices share SAME data**

* Admin adds librarian on Device A
* Librarian opens Device B → activation works
* Book added in Device A appears automatically in Device B
* Borrow/return syncs both ways
* Device binding works correctly
* Device B cannot login using librarian from Device A unless properly activated
* PIN change flows work
* Reset PIN works
* Deleted librarian propagates to all devices

---

# 🧪 **Step 5 — Updated Test Plan (Phase 1.6)**

### **A. Cloud Activation**

* A1: Admin activates device 1 → snapshot correct
* A2: Librarian activates device 2 → snapshot correct
* A3: PIN change forced
* A4: Device binding stored in server
* A5: Same username cannot activate on another device unless admin unbinds

### **B. Real-Time Sync**

* B1: Add book on device 1 → appears on device 2 after pull
* B2: Edit book → sync to both
* B3: Add user → sync
* B4: Borrow transaction → sync
* B5: Return transaction → sync

### **C. Admin Operations**

* C1: Reset PIN (server generates new hash correctly)
* C2: Unbind device → next login blocked
* C3: Delete librarian → deletion syncs both devices
* C4: Add librarian → new user appears device B

### **D. Error Handling**

* D1: No internet → fallback to cached mode
* D2: Server unreachable → local continues
* D3: Commit stuck → pushPendingCommits retries

--- 