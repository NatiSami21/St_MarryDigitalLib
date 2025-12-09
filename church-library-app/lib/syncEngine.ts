// lib/syncEngine.ts
/**
 * Sync engine for Church Library App
 *
 * Responsibilities:
 *  - push pending commits to the server
 *  - pull snapshot / incremental updates from the server
 *  - apply server snapshot locally (safe upserts)
 *  - write sync logs and update meta (last_push / last_pull)
 *
 * Notes:
 *  - Uses ONLINE_MODE env var: if ONLINE_MODE !== 'true' the engine uses mocked responses
 *  - Adjust endpoints (PUSH_URL / PULL_URL) to match your server API
 * 
 * Adjust server endpoints (PUSH_URL / PULL_URL) to your real API URLs and ensure they accept the payload shape used here. The server should return { ok: true, pushedIds: [...], serverTime: "..." } for push and { ok: true, snapshot: {...}, serverTime: "..." } for pull — or adapt the parsing accordingly.
 * Snapshot format — I implemented a conservative snapshot applier that expects arrays under keys books, users, librarians, transactions, pending_commits. If your server returns a different schema, update applySnapshotLocally().
 * Conflict resolution / merge logic — this engine uses server-as-source-of-truth for snapshot pulls and optimistic local updates for pushes. For complex merges you can implement conflict resolution strategies later (e.g., last-write-wins, commit replay, or per-field merge).
 * Testing — With ONLINE_MODE !== 'true' the engine uses mocked responses so you can simulate flows locally. To test real sync set ONLINE_MODE=true and set EXPO_PUBLIC_API_BASE_URL appropriately.
 * 
 * 
 */

import { getPendingCommits, markCommitsSynced, getPendingCommitsCount } from "../db/queries/sync";
import {
  insertSyncLog,
  setLastPushTime,
  setLastPullTime,
  getDeviceId,
} from "../db/queries/sync";
import { runAsync, getAllAsync, getOneAsync } from "../db/sqlite";

const ONLINE = process.env.ONLINE_MODE === "true";

// Server endpoints (adjust to your server)
const PUSH_URL = process.env.EXPO_PUBLIC_API_BASE_URL ? `${process.env.EXPO_PUBLIC_API_BASE_URL}/api/sync/push` : "https://example.com/api/sync/push";
const PULL_URL = process.env.EXPO_PUBLIC_API_BASE_URL ? `${process.env.EXPO_PUBLIC_API_BASE_URL}/api/sync/pull` : "https://example.com/api/sync/pull";

// controls
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
 * Mocked server behavior (for offline testing)
 * ------------------------*/
async function mockedPush(payload: any) {
  await delay(300);
  // Accept everything and pretend commit ids returned as pushed
  return {
    ok: true,
    pushedIds: payload.map((c: any) => c.id),
    serverTime: new Date().toISOString(),
  };
}

async function mockedPull(deviceId: string | null, lastPull: string | null) {
  await delay(300);
  // Return an empty snapshot (nothing new) for testing
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

/* -------------------------
 * Push pending commits
 * ------------------------*/
export async function pushPendingCommits(): Promise<{ success: boolean; pushedIds?: number[]; message?: string }> {
  try {
    const pending = await getPendingCommits();
    if (pending.length === 0) {
      return { success: true, pushedIds: [], message: "No pending commits" };
    }

    // chunk the commits
    const chunks: typeof pending[] = [];
    for (let i = 0; i < pending.length; i += BATCH_SIZE) {
      chunks.push(pending.slice(i, i + BATCH_SIZE));
    }

    const deviceId = await getDeviceId();

    const pushedIds: number[] = [];

    for (const chunk of chunks) {
      const payload = chunk.map((c) => ({
        id: c.id,
        action: c.action,
        table: c.table_name,
        payload: safeJsonParse(c.payload),
        timestamp: c.timestamp,
      }));

      let response: any;

      if (!ONLINE) {
        response = await mockedPush(payload);
      } else {
        const res = await fetch(PUSH_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ device_id: deviceId, commits: payload }),
        });

        if (!res.ok) {
          const text = await res.text();
          throw new Error(`Push failed: ${res.status} ${text}`);
        }
        response = await res.json();
      }

      if (!response.ok) {
        // Log failure and stop
        await insertSyncLog(deviceId, "failed", `Push chunk failed: ${JSON.stringify(response)}`);
        return { success: false, message: "Server rejected chunk" };
      }

      const returnedIds: number[] = response.pushedIds ?? chunk.map((c) => c.id);
      pushedIds.push(...returnedIds);

      // mark them as synced locally
      await markCommitsSynced(returnedIds);
    }

    const now = new Date().toISOString();
    await setLastPushTime(now);
    await insertSyncLog(deviceId, "success", `Pushed ${pushedIds.length} commits`);
    return { success: true, pushedIds };
  } catch (err: any) {
    try {
      const deviceId = await getDeviceId();
      await insertSyncLog(deviceId, "failed", `Push error: ${String(err?.message || err)}`);
    } catch (_) {}
    return { success: false, message: String(err?.message || err) };
  }
}

/* -------------------------
 * Pull snapshot / incremental data
 * ------------------------*/
export async function pullSnapshot(): Promise<{ success: boolean; applied?: boolean; message?: string }> {
  try {
    const deviceId = await getDeviceId();
    const lastPull = await getOneAsync<{ value: string }>(`SELECT value FROM meta WHERE key = 'last_pull'`);

    const lastPullValue = (lastPull && (lastPull as any).value) ?? null;

    let response: any;
    if (!ONLINE) {
      response = await mockedPull(deviceId, lastPullValue);
    } else {
      const res = await fetch(PULL_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ device_id: deviceId, last_pulled_commit: lastPullValue }),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Pull failed: ${res.status} ${text}`);
      }
      response = await res.json();
    }

    if (!response.ok) {
      await insertSyncLog(deviceId, "failed", `Pull rejected: ${JSON.stringify(response)}`);
      return { success: false, message: "Server rejected pull" };
    }

    const snapshot = response.snapshot;

    // Apply snapshot locally (safe, idempotent)
    const applied = await applySnapshotLocally(snapshot);

    const now = response.serverTime ?? new Date().toISOString();
    await setLastPullTime(now);
    await insertSyncLog(deviceId, "success", `Pulled snapshot - applied: ${applied ? "yes" : "no"}`);
    return { success: true, applied };
  } catch (err: any) {
    try {
      const deviceId = await getDeviceId();
      await insertSyncLog(deviceId, "failed", `Pull error: ${String(err?.message || err)}`);
    } catch (_) {}
    return { success: false, message: String(err?.message || err) };
  }
}

/* -------------------------
 * Apply snapshot locally
 * Snapshot shape (expected):
 *  {
 *    books: [...],
 *    users: [...],
 *    librarians: [...],
 *    transactions: [...],
 *    pending_commits: [...],
 *    last_pulled_commit: string
 *  }
 *
 * This function does conservative upserts using simple INSERT OR REPLACE logic.
 * ------------------------*/
export async function applySnapshotLocally(snapshot: any): Promise<boolean> {
  if (!snapshot) return false;

  // Basic validation
  const tables = ["books", "users", "librarians", "transactions", "pending_commits"];
  const hasAny = tables.some((t) => Array.isArray(snapshot[t]) && snapshot[t].length > 0);

  // If snapshot empty, still update metadata if provided
  if (!hasAny && !snapshot.last_pulled_commit) return false;

  try {
    // Use a single transaction for safety
    await runAsync("BEGIN TRANSACTION");

    // NOTE: Keep these upserts conservative - replace only core fields.
    if (Array.isArray(snapshot.books)) {
      for (const b of snapshot.books) {
        // Expected minimal book shape: { book_code, title, author, category, notes, copies, created_at, updated_at, sync_status }
        await runAsync(
          `INSERT INTO books (book_code, title, author, category, notes, copies, created_at, updated_at, sync_status)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON CONFLICT(book_code) DO UPDATE SET
             title = excluded.title,
             author = excluded.author,
             category = excluded.category,
             notes = excluded.notes,
             copies = excluded.copies,
             updated_at = excluded.updated_at,
             sync_status = excluded.sync_status;
          `,
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

    if (Array.isArray(snapshot.users)) {
      for (const u of snapshot.users) {
        await runAsync(
          `INSERT INTO users (fayda_id, name, phone, gender, address, photo_uri, created_at, updated_at, sync_status)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON CONFLICT(fayda_id) DO UPDATE SET
             name = excluded.name,
             phone = excluded.phone,
             gender = excluded.gender,
             address = excluded.address,
             photo_uri = excluded.photo_uri,
             updated_at = excluded.updated_at,
             sync_status = excluded.sync_status;
          `,
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

    if (Array.isArray(snapshot.librarians)) {
      for (const L of snapshot.librarians) {
        // keep local fields: username, full_name, role, device_id, pin_salt, pin_hash, deleted
        await runAsync(
          `INSERT INTO librarians (username, full_name, role, device_id, pin_salt, pin_hash, deleted)
           VALUES (?, ?, ?, ?, ?, ?, ?)
           ON CONFLICT(username) DO UPDATE SET
             full_name = excluded.full_name,
             role = excluded.role,
             device_id = excluded.device_id,
             pin_salt = excluded.pin_salt,
             pin_hash = excluded.pin_hash,
             deleted = excluded.deleted;
          `,
          [
            L.username,
            L.full_name ?? L.username,
            L.role ?? "librarian",
            L.device_id ?? null,
            // snapshot may use either `pin_salt` or legacy `salt` — prefer pin_salt
            (L.pin_salt ?? L.salt) ?? null,
            L.pin_hash ?? null,
            L.deleted ?? 0,
          ]
        );
      }
    }

    if (Array.isArray(snapshot.transactions)) {
      for (const t of snapshot.transactions) {
        // Map snapshot to local transactions schema: tx_id, book_code, fayda_id, borrowed_at, returned_at, device_id, sync_status
        const borrowedAt = t.borrowed_at ?? t.timestamp ?? new Date().toISOString();
        const returnedAt = t.returned_at ?? null;
        const syncStatus = t.sync_status ?? (returnedAt ? "returned" : "synced");

        await runAsync(
          `INSERT INTO transactions (tx_id, book_code, fayda_id, borrowed_at, returned_at, device_id, sync_status)
           VALUES (?, ?, ?, ?, ?, ?, ?)
           ON CONFLICT(tx_id) DO UPDATE SET
             book_code = excluded.book_code,
             fayda_id = excluded.fayda_id,
             borrowed_at = excluded.borrowed_at,
             returned_at = excluded.returned_at,
             device_id = excluded.device_id,
             sync_status = excluded.sync_status;
          `,
          [
            t.tx_id,
            t.book_code,
            t.fayda_id,
            borrowedAt,
            returnedAt,
            t.device_id ?? null,
            syncStatus,
          ]
        );
      }
    }

    // pending_commits -> keep them local only if server returns new pending commits (rare)
    if (Array.isArray(snapshot.pending_commits)) {
      for (const pc of snapshot.pending_commits) {
        // insert only if not exist; keep as pending
        await runAsync(
          `INSERT OR IGNORE INTO pending_commits (action, table_name, payload, timestamp, synced)
           VALUES (?, ?, ?, ?, ?)`,
          [pc.action, pc.table_name, JSON.stringify(pc.payload), pc.timestamp ?? Date.now(), pc.synced ?? 0]
        );
      }
    }

    // commit transaction
    await runAsync("COMMIT");
  } catch (err) {
    // rollback and rethrow
    try {
      await runAsync("ROLLBACK");
    } catch (_) {}
    throw err;
  }

  // update last_pulled_commit if present
  if (snapshot.last_pulled_commit) {
    await setLastPullTime(snapshot.last_pulled_commit);
  }

  return true;
}

/* -------------------------
 * Full sync: push then pull
 * ------------------------*/
export async function syncAll(): Promise<{ success: boolean; details: any }> {
  // push first to ensure local commits reach server
  const pushResult = await pushPendingCommits();
  if (!pushResult.success) {
    return { success: false, details: { push: pushResult } };
  }

  const pullResult = await pullSnapshot();
  if (!pullResult.success) {
    return { success: false, details: { push: pushResult, pull: pullResult } };
  }

  return { success: true, details: { push: pushResult, pull: pullResult } };
}

/* -------------------------
 * Utility: quick status
 * ------------------------*/
export async function getSyncStatus() {
  const pendingCount = await getPendingCommitsCount();
  const lastPush = await getOneAsync<{ value: string }>(`SELECT value FROM meta WHERE key = 'last_push'`);
  const lastPull = await getOneAsync<{ value: string }>(`SELECT value FROM meta WHERE key = 'last_pull'`);
  return {
    pending: pendingCount,
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
