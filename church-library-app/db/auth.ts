// db/auth.ts
import { getAllAsync, runAsync, withTransactionSync } from "./sqlite";
import { generateSalt, hashPin, verifyPinHash } from "../lib/authUtils";


export interface CreateLibrarianArgs {
  username: string;
  pin: string;
  role?: "admin" | "librarian";
  device_id?: string | null;
}

export async function createLibrarian({
  username,
  pin,
  role = "librarian",
  device_id = null
}: CreateLibrarianArgs) {
  const salt = generateSalt();
  const hash = await hashPin(pin, salt);

  await runAsync(
    `INSERT INTO librarians (username, pin_salt, pin_hash, role, device_id, created_at)
     VALUES (?, ?, ?, ?, ?, datetime('now'))`,
    [username, salt, hash, role, device_id]
  );

  return true;
}
export async function getLibrarian(username: string) {
  const rows = await getAllAsync(`SELECT * FROM librarians WHERE username=?`, [
    username
  ]);
  return rows[0] || null;
}

export async function listLibrarians() {
  return await getAllAsync(`SELECT * FROM librarians WHERE deleted=0`);
}

export async function deleteLibrarian(username: string) {
  await runAsync(
    `UPDATE librarians SET deleted=1, updated_at=datetime('now') WHERE username=?`,
    [username]
  );
}

export async function bindDeviceToLibrarian(username: string, device_id: string) {
  await runAsync(
    `UPDATE librarians SET device_id=?, updated_at=datetime('now') WHERE username=?`,
    [device_id, username]
  );
}

export async function unbindDevice(username: string) {
  await runAsync(
    `UPDATE librarians SET device_id=NULL, updated_at=datetime('now') WHERE username=?`,
    [username]
  );
}

export async function verifyLibrarian(username: string, pin: string, currentDeviceId: string) {
  const user = await getLibrarian(username);

  if (!user || user.deleted === 1) {
    return { ok: false, reason: "not_found" };
  }

  const valid = await verifyPinHash(pin, user.pin_salt, user.pin_hash);
  if (!valid) return { ok: false, reason: "invalid_pin" };

  // Device binding rules:
  if (user.device_id && user.device_id !== currentDeviceId) {
    return { ok: false, reason: "device_mismatch" };
  }

  return {
    ok: true,
    user
  };
}

export async function getCurrentLocalAdminExists() {
  const rows = await getAllAsync(
    `SELECT * FROM librarians WHERE role='admin' AND deleted=0`
  );
  return rows.length > 0;
}
