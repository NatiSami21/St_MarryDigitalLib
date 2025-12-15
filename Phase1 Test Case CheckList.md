# Church Library App — Phase 1 Test Checklist

---

## 1. Default Admin Flow (Fresh Install / First-time admin activation)

- [X] **Preconditions:** Fresh install, online mode, server ready.
- [X] Launch app → see “Initial Setup Required” screen with “Begin Setup” button.
- [X] Tap “Begin Setup” → Activation screen appears.
- [X] Enter: Username `DiguwaSoft`, PIN `1366`.
- [X] Activation UI shown → network call returns success with snapshot.
- [X] Snapshot applied locally → log shows device binding.
- [X] DB check: `librarians` row for DiguwaSoft has correct `device_id`.
- [X] Redirected to `/auth/change-pin` (PIN change required).
- [X] Enter old PIN `1366`, new PIN `2544`, confirm.
- [X] Success message → redirected to Admin dashboard.
- [X] DB check: `pin_salt` and `pin_hash` updated.
- [X] Admin dashboard shows username and menu options.
- [X] Log out → returned to `/auth/login`.

**Edge Cases:**

- [X] Wrong PIN → “Activation Failed: Incorrect PIN”.
- [X] No network → network error alert.

---

## 2. New Admin Flow (Admin creates another admin)

- [X] **Preconditions:** Device A (DiguwaSoft admin), Device B fresh.
- [X] Device A: Admin → Manage Librarians → + Add Librarian.
- [X] Enter: `AdminTwo`, `Admin Two`, role `admin`.
- [X] UI shows temporary PIN.
- [X] DB check: local `librarians` row created.
- [X] Sync push from Device A → success log entry.
- [X] Server check: `librarians` table contains `AdminTwo`.
- [X] Device B: Fresh install → activate with `AdminTwo` and temp PIN.
- [X] Activation succeeds → snapshot applied, device bound.
- [X] PIN change enforced → change to new PIN.
- [X] Dashboard accessible.

**Edge Cases:**

- [X] Activation fails if Device A hasn’t pushed commits.

---

## 3. Day-to-Day Admin Flow

- [X] **Preconditions:** Device A (DiguwaSoft), Device B (AdminTwo) active.
- [X] Device A: Manage Librarians → select `AdminTwo` → Reset PIN.
- [X] Confirm reset → temp PIN shown, local commit created.
- [X] Supabase row shows: require_pin_change = true, device_id = null
- [X] Device B actions can't be syced to sever anymore
- [X] Device B: Reactivate with new temp PIN → success, PIN change required.
- [X] Device A: Unbind `AdminTwo` device.
- [X] Server: `device_id` becomes NULL after sync.
- [X] View Sync Status on dashboard → shows pending count and timestamps.

**Edge Cases:**

- [X] Push failure → sync log records failure, UI alert.

---

## 4. New Librarian Added & Installed Flow

- [X] **Preconditions:** Shifts table ready, Device A admin, Device C fresh.
- [X] Device A: Add librarian `lib-new`.
- [X] Assign today’s shift to `lib-new`.
- [X] Sync push → server updated.
- [X] Device C: Activate with `lib-new` and temp PIN.
- [X] Activation success → shift saved locally, PIN change enforced.
- [X] Login during shift → allowed, librarian dashboard.
- [X] Log out, set time outside shift → login blocked.

**Edge Cases:**

- [X] Activation without shift → login blocked.
- [X] Shift not synced → activation still succeeds if snapshot includes shift.

---

## 5. Day-to-Day Librarian Flow

- [X] **Preconditions:** Librarian logged in during shift, books/users exist.
- [X] Login as `lib1` during shift → success.
- [ ] Borrow book: scan user `user-1`, book `book-1`.
- [ ] Local `transactions` row created, sync pending.
- [ ] Sync push → server updated, log success.
- [ ] Return book → `transactions` updated, commit queued.
- [ ] Offline borrow → commit created, later sync succeeds.

**Edge Cases:**

- [ ] Borrow with 0 copies → UI blocks.
- [ ] Login outside shift → prevented.

---

## Cross-cutting Tests

- [ ] **Device Binding:** `meta.device_id` matches `librarians.device_id`.
- [ ] **Sync Recovery:** Push failure → log entry; retry after server back → success.
- [ ] **Security:** PIN hashed & salted, raw PIN never stored.
- [ ] **Race Conditions:** Concurrent pushes → no duplicate commits.
- [ ] **Timezone Handling:** Shift times use local device time.

---

## Test Data Used

- Admin: `DiguwaSoft` / `1366` → `2468`
- Librarian: `lib1` / `0000` → `4567`
- Book: `book-1`, copies = 3
- User: `user-1`
- Shift: today 08:00–16:00

---

## Sign-off

- [ ] All steps passed, logs and screenshots attached.
- [ ] Failures documented with reproduction steps and DB/log snapshots.

---

*Checklist completed on:* ______________
*Tester:* ______________
*Sign-off:* ______________
