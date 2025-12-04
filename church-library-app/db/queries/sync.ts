// db/queries/sync.ts

import { db, getAllAsync, getOneAsync, runAsync } from "../sqlite";

/* ---------------------------------------------------------
 * Types
 * --------------------------------------------------------*/
export interface PendingCommit {
  id: number;
  action: string;
  table_name: string;
  payload: string; // JSON string
  timestamp: number;
  synced: number; // 0 = pending, 1 = synced
}

export interface SyncLogEntry {
  id: number;
  device_id: string | null;
  status: "success" | "failed";
  details: string;
  timestamp: string;
}

/* ---------------------------------------------------------
 * Pending Commit Queries
 * --------------------------------------------------------*/

/** Get count of pending commits */
export async function getPendingCommitsCount(): Promise<number> {
  try {
    const row = await getOneAsync<{ count: number }>(
      `SELECT COUNT(*) as count FROM pending_commits WHERE synced = 0`
    );
    return row?.count ?? 0;
  } catch (err) {
    console.log("❌ getPendingCommitsCount error:", err);
    return 0;
  }
}

/** Get all pending commits */
export async function getPendingCommits(): Promise<PendingCommit[]> {
  return getAllAsync<PendingCommit>(
    `SELECT * FROM pending_commits WHERE synced = 0 ORDER BY timestamp ASC`
  );
}

/** Mark commits as synced */
export async function markCommitsSynced(ids: number[]): Promise<void> {
  if (ids.length === 0) return;

  const placeholders = ids.map(() => "?").join(",");
  await runAsync(
    `UPDATE pending_commits SET synced = 1 WHERE id IN (${placeholders})`,
    ids
  );
}

/** Reset a commit to pending (for rollback scenarios) */
export async function markCommitPending(id: number): Promise<void> {
  await runAsync(
    `UPDATE pending_commits SET synced = 0 WHERE id = ?`,
    [id]
  );
}

/* ---------------------------------------------------------
 * Sync Log Queries
 * --------------------------------------------------------*/

/** Insert a sync log entry */
export async function insertSyncLog(
  device_id: string | null,
  status: "success" | "failed",
  details: string
): Promise<void> {
  const ts = new Date().toISOString();

  await runAsync(
    `
    INSERT INTO sync_log (device_id, status, details, timestamp)
    VALUES (?, ?, ?, ?)
  `,
    [device_id, status, details, ts]
  );
}

/** Get latest 50 sync logs (newest first) */
export async function getSyncLogs(
  limit = 50
): Promise<SyncLogEntry[]> {
  return getAllAsync<SyncLogEntry>(
    `
    SELECT * FROM sync_log
    ORDER BY id DESC
    LIMIT ?
  `,
    [limit]
  );
}

/* ---------------------------------------------------------
 * Last Push / Last Pull Tracking (using meta table)
 * --------------------------------------------------------*/

export async function getLastPushTime(): Promise<string | null> {
  const row = await getOneAsync<{ value: string }>(
    `SELECT value FROM meta WHERE key = 'last_push'`
  );
  return row?.value ?? null;
}

export async function getLastPullTime(): Promise<string | null> {
  const row = await getOneAsync<{ value: string }>(
    `SELECT value FROM meta WHERE key = 'last_pull'`
  );
  return row?.value ?? null;
}

export async function setLastPushTime(ts: string): Promise<void> {
  await runAsync(
    `
    INSERT INTO meta (key, value)
    VALUES ('last_push', ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value;
  `,
    [ts]
  );
}

export async function setLastPullTime(ts: string): Promise<void> {
  await runAsync(
    `
    INSERT INTO meta (key, value)
    VALUES ('last_pull', ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value;
  `,
    [ts]
  );
}

/* ---------------------------------------------------------
 * Device ID / Meta helpers
 * --------------------------------------------------------*/

/** Get meta value by key */
export async function getMetaValue(key: string): Promise<string | null> {
  const row = await getOneAsync<{ value: string }>(
    `SELECT value FROM meta WHERE key = ?`,
    [key]
  );
  return row?.value ?? null;
}

/** Set meta value */
export async function setMetaValue(key: string, value: string): Promise<void> {
  await runAsync(
    `
    INSERT INTO meta (key, value)
    VALUES (?, ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value;
    `,
    [key, value]
  );
}

/** Get device_id */
export async function getDeviceId(): Promise<string | null> {
  return getMetaValue("device_id");
}

/** Save device_id */
export async function setDeviceId(id: string): Promise<void> {
  return setMetaValue("device_id", id);
}
