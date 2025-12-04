// /db/queries/commits.ts

export interface PendingCommit {
  id: number;
  action: string;        // insert, update, delete, borrow, return, unbind...
  table_name: string;    // books, users, transactions, librarians...
  payload: string;       // JSON string
  timestamp: number;     // Unix ms
  synced: number;        // 0 = pending, 1 = synced
}

import { getAllAsync, getOneAsync, runAsync } from "../sqlite";

export async function getPendingCommits(): Promise<PendingCommit[]> {
  return await getAllAsync<PendingCommit>(
    `SELECT * FROM pending_commits WHERE synced = 0 ORDER BY timestamp DESC`
  );
}

export async function getSyncedCommits(): Promise<PendingCommit[]> {
  return await getAllAsync<PendingCommit>(
    `SELECT * FROM pending_commits WHERE synced = 1 ORDER BY timestamp DESC`
  );
}

export async function getPendingCommitCount(): Promise<number> {
  const row = await getOneAsync<{ count: number }>(
    `SELECT COUNT(*) as count FROM pending_commits WHERE synced = 0`
  );
  return row?.count ?? 0;
}

export async function markCommitAsSynced(id: number) {
  await runAsync(
    `UPDATE pending_commits SET synced = 1 WHERE id = ?`,
    [id]
  );
}

export async function deleteCommit(id: number) {
  await runAsync(`DELETE FROM pending_commits WHERE id = ?`, [id]);
}
