// lib/activation.ts
import { runAsync, execSync } from "../db/sqlite";

/**
 * Apply server snapshot into local DB.
 * This function is intentionally cautious and idempotent.
 *
 * snapshot = { books: [...], users: [...], librarians: [...], commits: [...] }
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

  // Create meta table if missing and helpers
  try {
    execSync(`
      CREATE TABLE IF NOT EXISTS meta (
        key TEXT PRIMARY KEY,
        value TEXT
      );
    `);
  } catch (e) {
    console.warn("meta table create warning:", e);
  }

  // Wrap operations in transaction where possible
  try {
    // books
    if (Array.isArray(snapshot.books)) {
      for (const b of snapshot.books) {
        await runAsync(
          `INSERT OR REPLACE INTO books (book_code, title, author, category, notes, copies, created_at, updated_at, sync_status)
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

    // users
    if (Array.isArray(snapshot.users)) {
      for (const u of snapshot.users) {
        await runAsync(
          `INSERT OR REPLACE INTO users (fayda_id, name, phone, photo_uri, created_at, updated_at, sync_status)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            u.fayda_id,
            u.name ?? "",
            u.phone ?? "",
            u.photo_uri ?? "",
            u.created_at ?? new Date().toISOString(),
            u.updated_at ?? new Date().toISOString(),
            u.sync_status ?? "synced",
          ]
        );
      }
    }

    // librarians
    if (Array.isArray(snapshot.librarians)) {
      // create librarians table if not exists (migration might handle this normally)
      try {
        execSync(`
          CREATE TABLE IF NOT EXISTS librarians (
            username TEXT PRIMARY KEY,
            pin_salt TEXT,
            pin_hash TEXT,
            role TEXT,
            device_id TEXT,
            created_at TEXT,
            updated_at TEXT,
            deleted INTEGER DEFAULT 0
          );
        `);
      } catch (e) {
        // ignore
      }

      for (const l of snapshot.librarians) {
        await runAsync(
          `INSERT OR REPLACE INTO librarians (username, pin_salt, pin_hash, role, device_id, created_at, updated_at, deleted)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            l.username,
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

    // commits - optional
    if (Array.isArray(snapshot.commits)) {
      // create commits table if needed
      try {
        execSync(`
          CREATE TABLE IF NOT EXISTS commits (
            commit_id TEXT PRIMARY KEY,
            librarian_username TEXT,
            device_id TEXT,
            type TEXT,
            payload TEXT,
            pushed INTEGER DEFAULT 0,
            created_at TEXT
          );
        `);
      } catch (e) {}
      for (const c of snapshot.commits) {
        await runAsync(
          `INSERT OR REPLACE INTO commits (commit_id, librarian_username, device_id, type, payload, pushed, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            c.commit_id,
            c.librarian_username ?? "",
            c.device_id ?? "",
            c.type ?? "",
            JSON.stringify(c.payload ?? {}),
            c.pushed ? 1 : 0,
            c.created_at ?? new Date().toISOString(),
          ]
        );
      }
    }

    // mark meta values
    if (lastPulledCommit) {
      await runAsync(`INSERT OR REPLACE INTO meta (key, value) VALUES ('last_pulled_commit', ?)`, [String(lastPulledCommit)]);
    }

    await runAsync(`INSERT OR REPLACE INTO meta (key, value) VALUES ('device_id', ?)`, [device_id ?? ""]);
    await runAsync(`INSERT OR REPLACE INTO meta (key, value) VALUES ('initialized', '1')`, []);

    // Optionally create a small local audit commit about activation
    const activationCommitId = "commit-activation-" + Date.now();
    try {
      await runAsync(
        `INSERT OR REPLACE INTO commits (commit_id, librarian_username, device_id, type, payload, pushed, created_at)
         VALUES (?, ?, ?, ?, ?, 1, ?)`,
        [activationCommitId, activatedBy ?? "system", device_id ?? "", "activation", JSON.stringify({ activatedBy }), new Date().toISOString()]
      );
    } catch (e) {
      // ignore
    }

    return true;
  } catch (e) {
    console.error("applySnapshot error:", e);
    throw e;
  }
}
