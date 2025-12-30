// church-library-app/db/commits.ts
import { db } from "./sqlite";

export interface Commit {
  id: number;
  commit_id: string;
  librarian_username: string | null;
  device_id: string | null;
  type: string; // insert, update, delete, borrow, return, etc.
  payload: string; // JSON string
  timestamp: string;
  pushed: number; // 0 = pending, 1 = pushed
}

/**
 * Add a new commit to the commits table
 */
export async function addCommit(
  type: string,
  tableName: string,
  payload: any
): Promise<void> {
  const timestamp = new Date().toISOString();
  const commitId = `${tableName}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  // Store the payload as a JSON string
  const payloadStr = JSON.stringify(payload);
  
  await db.runAsync(
    `
    INSERT INTO commits (commit_id, librarian_username, device_id, type, payload, timestamp, pushed)
    VALUES (?, ?, ?, ?, ?, ?, 0)
    `,
    [
      commitId,
      null, // librarian_username - will be filled during sync
      null, // device_id - will be filled during sync
      type,
      payloadStr,
      timestamp
    ]
  );
  
  // Also add to pending_commits table for backward compatibility
  await addPendingCommit(type, tableName, payloadStr);
}

/**
 * Add a commit to pending_commits table (legacy)
 */
export async function addPendingCommit(
  action: string,
  tableName: string,
  payload: string
): Promise<void> {
  const timestamp = Date.now();
  
  await db.runAsync(
    `
    INSERT INTO pending_commits (action, table_name, payload, timestamp, synced)
    VALUES (?, ?, ?, ?, 0)
    `,
    [action, tableName, payload, timestamp]
  );
}

/**
 * Get all pending commits
 */
export async function getPendingCommits(): Promise<Commit[]> {
  const rows = await db.getAllAsync(
    `SELECT * FROM commits WHERE pushed = 0 ORDER BY timestamp ASC`
  );
  return rows as Commit[];
}

/**
 * Mark commits as pushed
 */
export async function markCommitsPushed(ids: number[]): Promise<void> {
  if (ids.length === 0) return;

  const placeholders = ids.map(() => "?").join(",");
  await db.runAsync(
    `UPDATE commits SET pushed = 1 WHERE id IN (${placeholders})`,
    ids
  );
}

/**
 * Get commit by ID
 */
export async function getCommit(id: number): Promise<Commit | null> {
  const row = await db.getFirstAsync(
    `SELECT * FROM commits WHERE id = ?`,
    [id]
  );
  return (row as Commit) ?? null;
}

/**
 * Get commits for a specific table
 */
export async function getCommitsByTable(tableName: string): Promise<Commit[]> {
  const rows = await db.getAllAsync(
    `SELECT * FROM commits WHERE payload LIKE ? ORDER BY timestamp DESC`,
    [`%${tableName}%`]
  );
  return rows as Commit[];
}