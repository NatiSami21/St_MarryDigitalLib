// lib/activation.ts
import { runAsync, execSync } from "../db/sqlite";

/**
 * Apply server snapshot into local DB.
 */
export async function applySnapshot({
  snapshot,
  device_id,
  activatedBy,
  lastPulledCommit,
}: {
  snapshot: any;
  device_id: string | null;
  activatedBy: string;
  lastPulledCommit: string | null;
}) {
  if (!snapshot) throw new Error("No snapshot provided");

  // META TABLE
  execSync(`
    CREATE TABLE IF NOT EXISTS meta (
      key TEXT PRIMARY KEY,
      value TEXT
    );
  `);

  try {
    //
    // BOOKS
    //
    if (Array.isArray(snapshot.books)) {
      for (const b of snapshot.books) {
        await runAsync(
          `INSERT OR REPLACE INTO books
            (book_code, title, author, category, notes, copies,
             created_at, updated_at, sync_status)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            b.book_code,
            b.title,
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

    //
    // USERS
    //
    if (Array.isArray(snapshot.users)) {
      for (const u of snapshot.users) {
        await runAsync(
          `INSERT OR REPLACE INTO users
            (fayda_id, name, phone, gender, address, photo_uri,
             created_at, updated_at, sync_status)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            u.fayda_id,
            u.name ?? "",
            u.phone ?? "",
            u.gender ?? null,
            u.address ?? null,
            u.photo_uri ?? "",
            u.created_at ?? new Date().toISOString(),
            u.updated_at ?? new Date().toISOString(),
            u.sync_status ?? "synced",
          ]
        );
      }
    }

    //
    // LIBRARIANS
    //
    if (Array.isArray(snapshot.librarians)) {
      for (const l of snapshot.librarians) {
        await runAsync(
          `INSERT OR REPLACE INTO librarians
            (username, full_name, pin_salt, pin_hash, role,
             device_id, created_at, updated_at, deleted)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            l.username,
            l.full_name ?? l.username ?? "",
            l.pin_salt ?? "",
            l.pin_hash ?? "",
            l.role ?? "librarian",
            l.device_id ?? null,
            l.created_at ?? new Date().toISOString(),
            l.updated_at ?? new Date().toISOString(),
            l.deleted ?? 0,
          ]
        );
      }
    }

    //
    // COMMITS
    //
    if (Array.isArray(snapshot.commits)) {
      for (const c of snapshot.commits) {
        await runAsync(
          `INSERT OR REPLACE INTO commits
            (commit_id, librarian_username, device_id, type,
             payload, timestamp, pushed)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            c.commit_id,
            c.librarian_username ?? "",
            c.device_id ?? "",
            c.type ?? "",
            JSON.stringify(c.payload ?? {}),
            c.timestamp ?? new Date().toISOString(),
            c.pushed ? 1 : 0,
          ]
        );
      }
    }

    //
    // META VALUES
    //
    if (lastPulledCommit) {
      await runAsync(
        `INSERT OR REPLACE INTO meta (key,value)
         VALUES ('last_pulled_commit', ?)`,
        [String(lastPulledCommit)]
      );
    }

    await runAsync(
      `INSERT OR REPLACE INTO meta (key,value)
       VALUES ('device_id', ?)`,
      [device_id ?? ""]
    );

    await runAsync(
      `INSERT OR REPLACE INTO meta (key,value)
       VALUES ('initialized', '1')`
    );

    //
    // LOCAL ACTIVATION COMMIT
    //
    const activationCommitId = "commit-activation-" + Date.now();
    await runAsync(
      `INSERT OR REPLACE INTO commits
        (commit_id, librarian_username, device_id, type,
         payload, timestamp, pushed)
       VALUES (?, ?, ?, ?, ?, ?, 1)`,
      [
        activationCommitId,
        activatedBy ?? "system",
        device_id ?? "",
        "activation",
        JSON.stringify({ activatedBy }),
        new Date().toISOString(),
      ]
    );

    return true;

  } catch (e) {
    console.error("applySnapshot error:", e);
    throw e;
  }
}
