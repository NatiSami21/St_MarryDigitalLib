// db/queries/librarians.ts
import { getOneAsync } from "../sqlite";
import { db } from "../sqlite";
import { addCommit } from "../commits";

export interface Librarian {
  id: number;
  username: string;
  full_name: string;
  role: "admin" | "librarian";
  pin_salt: string | null;  // FIXED
  device_id: string | null;
  pin_hash: string | null;
  deleted: number;
}

export async function getAllLibrarians(): Promise<Librarian[]> {
  return db.getAllAsync<Librarian>(
    `SELECT * FROM librarians WHERE deleted = 0 ORDER BY full_name ASC`
  );
}

export async function getLibrarianById(id: number): Promise<Librarian | null> {
  return db.getFirstAsync<Librarian>(
    `SELECT * FROM librarians WHERE id = ?`,
    [id]
  );
}

export async function getLibrarianByUsername(username: string): Promise<Librarian | null> {
  return db.getFirstAsync<Librarian>(
    `SELECT * FROM librarians WHERE username = ?`,
    [username]
  );
}

export async function isUsernameTaken(username: string): Promise<boolean> {
  const row = await getOneAsync<{ count: number }>(
    `SELECT COUNT(*) AS count FROM librarians WHERE username = ?`,
    [username]
  );

  return (row?.count ?? 0) > 0;
}

export interface CreateLibrarianInput {
  username: string;
  full_name: string;
  role: "admin" | "librarian";
  pin_salt: string;       // FIXED
  pin_hash: string;
}

export async function insertLibrarian(data: CreateLibrarianInput) {
  const { username, full_name, role, pin_salt, pin_hash } = data;

  await db.runAsync(
    `INSERT INTO librarians (username, full_name, role, pin_salt, pin_hash, deleted)
     VALUES (?, ?, ?, ?, ?, 0)`,
    [username, full_name, role, pin_salt, pin_hash]
  );

  await addCommit("insert", "librarians", data);
}

export async function softDeleteLibrarian(id: number) {
  await db.runAsync(
    `UPDATE librarians SET deleted = 1 WHERE id = ?`,
    [id]
  );

  await addCommit("soft_delete", "librarians", { id });
}

export async function getLibrarianCount() {
  const row = await getOneAsync<{ count: number }>(
    "SELECT COUNT(*) as count FROM librarians"
  );
  return row?.count ?? 0;
}

export async function unbindLibrarianDevice(id: number) {
  await db.runAsync(
    `UPDATE librarians SET device_id = NULL WHERE id = ?`,
    [id]
  );

  await addCommit("unbind_device", "librarians", { id });
}

export async function updateLibrarianPin(
  id: number,
  pin_salt: string,
  pin_hash: string
) {
  await db.runAsync(
    `UPDATE librarians SET pin_salt = ?, pin_hash = ? WHERE id = ?`,
    [pin_salt, pin_hash, id]
  );

  await addCommit("reset_pin", "librarians", { id, pin_salt, pin_hash });
}

export async function updateLibrarian(
  id: number,
  fields: Partial<Omit<Librarian, "id">>
) {
  // Only allow updates to known columns to avoid accidental SQL errors
  const allowed = new Set(["username", "full_name", "role", "device_id", "pin_salt", "pin_hash", "deleted", "created_at", "updated_at"]);
  const entries = Object.entries(fields).filter(([k]) => allowed.has(k));

  if (entries.length === 0) return;

  const keys = entries.map(([k]) => k);
  const values = entries.map(([, v]) => v);

  const set = keys.map(k => `${k} = ?`).join(", ");

  await db.runAsync(
    `UPDATE librarians SET ${set} WHERE id = ?`,
    [...values, id]
  );

  await addCommit("update", "librarians", { id, ...Object.fromEntries(entries) });
}
