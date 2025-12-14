// lib/syncEngine.ts
/**
 * FINAL PATCHED VERSION — FIXES:
 *  1. Correct push payload structure (commit_id, table_name, action, payload, timestamp, device_id, librarian_username)
 *  2. Correct pull username (uses getSession() instead of "admin")
 */

import {
  getPendingCommits,
  markCommitsSynced,
  getPendingCommitsCount,
} from "../db/queries/sync";
import {
  insertSyncLog,
  setLastPushTime,
  setLastPullTime,
  getDeviceId,
} from "../db/queries/sync";
import { runAsync, getOneAsync } from "../db/sqlite";

// NEW — import session (your actual session store)
import { getSession } from "../lib/session";

/* -------------------------
 * Cloud endpoints
 * ------------------------*/
const base = process.env.EXPO_PUBLIC_API_BASE_URL;

const PUSH_URL = `${base}/sync-push`;
const PULL_URL = `${base}/sync-pull`;

const ONLINE =
  process.env.EXPO_PUBLIC_ONLINE_MODE === "true" ||
  process.env.NODE_ENV === "production";

const BATCH_SIZE = 50;

/* -------------------------
 * Helpers
 * ------------------------*/
function delay(ms: number) {
  return new Promise((res) => setTimeout(res, ms));
}

function safeJsonParse<T = any>(s: string | null): T | null {
  if (!s) return null;
  try {
    return JSON.parse(s) as T;
  } catch {
    return null;
  }
}

/* -------------------------
 * Mock offline
 * ------------------------*/
async function mockedPush(payload: any) {
  await delay(300);
  return {
    ok: true,
    pushedIds: payload.map((c: any) => c.commit_id),
    serverTime: new Date().toISOString(),
  };
}

async function mockedPull(deviceId: string | null, lastPull: string | null) {
  await delay(300);
  return {
    ok: true,
    snapshot: {
      books: [],
      users: [],
      librarians: [],
      transactions: [],
      pending_commits: [],
      last_pulled_commit: lastPull ?? null,
    },
    serverTime: new Date().toISOString(),
  };
}

/* --------------------------------------------------
 * PUSH — Send pending commits to server (PATCHED)
 * --------------------------------------------------*/
export async function pushPendingCommits() {
  try {
    const pending = await getPendingCommits();
    if (pending.length === 0) {
      return { success: true, pushedIds: [], message: "No pending commits" };
    }

    const chunks: typeof pending[] = [];
    for (let i = 0; i < pending.length; i += BATCH_SIZE) {
      chunks.push(pending.slice(i, i + BATCH_SIZE));
    }

    const deviceId = await getDeviceId();

    // NEW — REAL logged-in admin/librarian
    const session = await getSession();
    const librarianUsername = session?.username;

    if (!librarianUsername) {
      return { success: false, message: "No active session found" };
    }

    const pushedIds: number[] = [];

    for (const chunk of chunks) {
      // *** FIXED PAYLOAD FORMAT ***
      const payload = chunk.map((c) => ({
        commit_id: String(c.id),
        table_name: c.table_name,
        action: c.action,
        payload: safeJsonParse(c.payload),
        timestamp: c.timestamp,
        device_id: deviceId,
        librarian_username: librarianUsername,
      }));

      let response: any;

      if (!ONLINE) {
        response = await mockedPush(payload);
      } else {
        const res = await fetch(PUSH_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            device_id: deviceId,
            librarian_username: librarianUsername,
            commits: payload,
          }),
        });

        if (!res.ok) {
          const text = await res.text();
          throw new Error(`Push failed: ${res.status} ${text}`);
        }

        response = await res.json();
      }

      if (!response.ok) {
        await insertSyncLog(
          deviceId,
          "failed",
          `Push rejected: ${JSON.stringify(response)}`
        );
        return { success: false, message: "Server rejected push" };
      }

      const returned = response.pushedIds ?? payload.map((c) => c.commit_id);
      const numeric = returned.map((x: any) => Number(x));

      pushedIds.push(...numeric);
      await markCommitsSynced(numeric);
    }

    const now = new Date().toISOString();
    await setLastPushTime(now);
    await insertSyncLog(deviceId, "success", `Pushed ${pushedIds.length} commits`);

    return { success: true, pushedIds };
  } catch (err: any) {
    const deviceId = await getDeviceId();
    await insertSyncLog(
      deviceId,
      "failed",
      `Push error: ${String(err?.message || err)}`
    );
    return { success: false, message: String(err?.message || err) };
  }
}

/* --------------------------------------------------
 * PULL — Request latest snapshot (PATCHED)
 * --------------------------------------------------*/
export async function pullSnapshot() {
  try {
    const deviceId = await getDeviceId();

    const lastPullRow = await getOneAsync<{ value: string }>(
      `SELECT value FROM meta WHERE key='last_pull'`
    );
    const lastPullValue = lastPullRow?.value ?? null;

    // NEW — real username from session
    const session = await getSession();
    const librarianUsername = session?.username;

    if (!librarianUsername) {
      return { success: false, message: "No active session" };
    }

    let response: any;

    if (!ONLINE) {
      response = await mockedPull(deviceId, lastPullValue);
    } else {
      const res = await fetch(PULL_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          device_id: deviceId,
          librarian_username: librarianUsername,
          last_pulled_commit: lastPullValue,
        }),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Pull failed: ${res.status} ${text}`);
      }

      response = await res.json();
    }

    if (!response.ok) {
      await insertSyncLog(
        deviceId,
        "failed",
        `Pull rejected: ${JSON.stringify(response)}`
      );
      return { success: false, message: "Server rejected pull" };
    }

    const applied = await applySnapshotLocally(response.snapshot);

    const now = response.serverTime ?? new Date().toISOString();
    await setLastPullTime(now);

    await insertSyncLog(deviceId, "success", `Pulled snapshot (applied=${applied})`);

    return { success: true, applied };
  } catch (err: any) {
    const deviceId = await getDeviceId();
    await insertSyncLog(
      deviceId,
      "failed",
      `Pull error: ${String(err?.message || err)}`
    );
    return { success: false, message: String(err?.message || err) };
  }
}

/* --------------------------------------------------
 * Apply snapshot locally (unchanged, correct)
 * --------------------------------------------------*/
export async function applySnapshotLocally(snapshot: any): Promise<boolean> {
  if (!snapshot) return false;

  const tables = ["books", "users", "librarians", "transactions", "shifts", "pending_commits"];
  const hasAny = tables.some(
    (t) => Array.isArray(snapshot[t]) && snapshot[t].length > 0
  );

  if (!hasAny && !snapshot.last_pulled_commit) return false;

  try {
    await runAsync("BEGIN TRANSACTION");

    // BOOKS
    if (Array.isArray(snapshot.books)) {
      for (const b of snapshot.books) {
        await runAsync(
          `INSERT INTO books (book_code, title, author, category, notes, copies, created_at, updated_at, sync_status)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON CONFLICT(book_code) DO UPDATE SET
             title=excluded.title,
             author=excluded.author,
             category=excluded.category,
             notes=excluded.notes,
             copies=excluded.copies,
             updated_at=excluded.updated_at,
             sync_status=excluded.sync_status`,
          [
            b.book_code,
            b.title ?? "",
            b.author ?? "",
            b.category ?? "",
            b.notes ?? "",
            b.copies ?? 1,
            b.created_at ?? new Date().toISOString(),
            b.updated_at ?? new Date().toISOString(),
            b.sync_status ?? "synced",
          ]
        );
      }
    }

    // USERS
    if (Array.isArray(snapshot.users)) {
      for (const u of snapshot.users) {
        await runAsync(
          `INSERT INTO users (fayda_id, name, phone, gender, address, photo_uri, created_at, updated_at, sync_status)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON CONFLICT(fayda_id) DO UPDATE SET
             name=excluded.name,
             phone=excluded.phone,
             gender=excluded.gender,
             address=excluded.address,
             photo_uri=excluded.photo_uri,
             updated_at=excluded.updated_at,
             sync_status=excluded.sync_status`,
          [
            u.fayda_id,
            u.name ?? "",
            u.phone ?? "",
            u.gender ?? "",
            u.address ?? "",
            u.photo_uri ?? "",
            u.created_at ?? new Date().toISOString(),
            u.updated_at ?? new Date().toISOString(),
            u.sync_status ?? "synced",
          ]
        );
      }
    }

    // LIBRARIANS
    if (Array.isArray(snapshot.librarians)) {
      for (const L of snapshot.librarians) {
        await runAsync(
          `INSERT INTO librarians (
            username,
            full_name,
            role,
            device_id,
            pin_salt,
            pin_hash,
            deleted,
            require_pin_change
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(username) DO UPDATE SET
            full_name=excluded.full_name,
            role=excluded.role,
            device_id=excluded.device_id,
            pin_salt=excluded.pin_salt,
            pin_hash=excluded.pin_hash,
            deleted=excluded.deleted,
            require_pin_change=excluded.require_pin_change`,
          [
            L.username,
            L.full_name ?? L.username,
            L.role ?? "librarian",
            L.device_id ?? null,
            L.pin_salt ?? null,
            L.pin_hash ?? null,
            L.deleted ?? 0,
            L.require_pin_change ? 1 : 0
          ]

        );
      }
    }

    // TRANSACTIONS
    if (Array.isArray(snapshot.transactions)) {
      for (const t of snapshot.transactions) {
        await runAsync(
          `INSERT INTO transactions (tx_id, book_code, fayda_id, borrowed_at, returned_at, device_id, sync_status)
           VALUES (?, ?, ?, ?, ?, ?, ?)
           ON CONFLICT(tx_id) DO UPDATE SET
             book_code=excluded.book_code,
             fayda_id=excluded.fayda_id,
             borrowed_at=excluded.borrowed_at,
             returned_at=excluded.returned_at,
             device_id=excluded.device_id,
             sync_status=excluded.sync_status`,
          [
            t.tx_id,
            t.book_code,
            t.fayda_id,
            t.borrowed_at ?? new Date().toISOString(),
            t.returned_at ?? null,
            t.device_id ?? null,
            t.sync_status ?? "synced",
          ]
        );
      }
    }

    // SHIFTS
    if (Array.isArray(snapshot.shifts)) {
      for (const s of snapshot.shifts) {
        await runAsync(
          `INSERT INTO shifts (
            id,
            librarian_username,
            date,
            start_time,
            end_time,
            created_at,
            updated_at
          )
          VALUES (?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET
            date=excluded.date,
            start_time=excluded.start_time,
            end_time=excluded.end_time,
            updated_at=excluded.updated_at`,
          [
            s.id,
            s.librarian_username,
            s.date,
            s.start_time,
            s.end_time,
            s.created_at,
            s.updated_at,
          ]
        );
      }
    }


    // PENDING COMMITS FROM SERVER
    if (Array.isArray(snapshot.pending_commits)) {
      for (const pc of snapshot.pending_commits) {
        await runAsync(
          `INSERT OR IGNORE INTO pending_commits (action, table_name, payload, timestamp, synced)
           VALUES (?, ?, ?, ?, ?)`,
          [
            pc.action,
            pc.table_name,
            JSON.stringify(pc.payload),
            pc.timestamp ?? Date.now(),
            pc.synced ?? 0,
          ]
        );
      }
    }

    await runAsync("COMMIT");
  } catch (err) {
    await runAsync("ROLLBACK");
    throw err;
  }

  return true;
}

/* --------------------------------------------------
 * FULL SYNC
 * --------------------------------------------------*/
export async function syncAll() {
  const push = await pushPendingCommits();
  if (!push.success) return { success: false, details: { push } };

  const pull = await pullSnapshot();
  if (!pull.success) return { success: false, details: { push, pull } };

  return { success: true, details: { push, pull } };
}

/* --------------------------------------------------
 * STATUS
 * --------------------------------------------------*/
export async function getSyncStatus() {
  const pending = await getPendingCommitsCount();
  const lastPush = await getOneAsync<{ value: string }>(
    `SELECT value FROM meta WHERE key='last_push'`
  );
  const lastPull = await getOneAsync<{ value: string }>(
    `SELECT value FROM meta WHERE key='last_pull'`
  );

  return {
    pending,
    lastPush: lastPush?.value ?? null,
    lastPull: lastPull?.value ?? null,
  };
}

export default {
  pushPendingCommits,
  pullSnapshot,
  syncAll,
  getSyncStatus,
};
