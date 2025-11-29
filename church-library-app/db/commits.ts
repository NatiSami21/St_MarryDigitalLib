// db/commits.ts
import { runAsync, getAllAsync } from "./sqlite";
import { v4 as uuid } from "uuid";

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
