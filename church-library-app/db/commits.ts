// db/commits.ts
import { runAsync, getAllAsync } from "./sqlite";
import { v4 as uuid } from "uuid";
import { db } from "./sqlite";

export interface CommitPayload {
  librarian_username: string;
  device_id: string;
  type: string;
  payload: any;
}

export async function appendCommit({
  librarian_username,
  device_id,
  type,
  payload
}: CommitPayload) {
  const commitId = uuid();

  await runAsync(
    `INSERT INTO commits (commit_id, librarian_username, device_id, type, payload, timestamp, pushed)
     VALUES (?, ?, ?, ?, ?, datetime('now'), 0)`,
    [commitId, librarian_username, device_id, type, JSON.stringify(payload)]
  );

  return commitId;
}

export async function addCommit(action: string, table: string, payload: any) {
  const ts = Date.now();

  await db.runAsync(
    `INSERT INTO pending_commits (action, table_name, payload, timestamp) VALUES (?, ?, ?, ?)`,
    [action, table, JSON.stringify(payload), ts]
  );
}
