import { db } from "./sqlite";
import { addCommit } from "./commits";

/* -------------------------------------------------------
 * TYPES
 * -----------------------------------------------------*/

export type User = {
  fayda_id: string;
  name: string;
  gender?: string;
  phone?: string;
  address?: string;
  photo_uri?: string;
  created_at: string;
  updated_at: string;
  sync_status: string;
};

export type UserUpsert = {
  fayda_id: string;
  name: string;
  gender?: string;
  phone?: string;
  address?: string;
  photo_uri?: string;
};

export type UserUpdate = {
  name: string;
  gender?: string;
  phone?: string;
  address?: string;
  photo_uri?: string | null;
};

/* -------------------------------------------------------
 * UPSERT USER (Create or Update in one query)
 * -----------------------------------------------------*/

export async function upsertUser(user: UserUpsert): Promise<void> {
  const now = new Date().toISOString();

  await db.runAsync(
    `
    INSERT INTO users (fayda_id, name, phone, gender, address, photo_uri, created_at, updated_at, sync_status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending')
    ON CONFLICT(fayda_id) DO UPDATE SET
      name = excluded.name,
      phone = excluded.phone,
      gender = excluded.gender,
      address = excluded.address,
      photo_uri = excluded.photo_uri,
      updated_at = excluded.updated_at,
      sync_status = 'pending'
    `,
    [
      user.fayda_id,
      user.name,
      user.phone ?? "",
      user.gender ?? "",
      user.address ?? "",
      user.photo_uri ?? "",
      now,
      now,
    ]
  );
}

/* -------------------------------------------------------
 * GET USER BY ID
 * -----------------------------------------------------*/

export async function getUser(fayda_id: string): Promise<User | null> {
  const row = await db.getFirstAsync(
    `SELECT * FROM users WHERE fayda_id = ?`,
    [fayda_id]
  );

  return (row as User) ?? null;
}

/* -------------------------------------------------------
 * LIST USERS
 * -----------------------------------------------------*/

export async function listUsers(): Promise<User[]> {
  const rows = await db.getAllAsync(
    `SELECT * FROM users ORDER BY created_at DESC`
  );

  return rows as User[];
}

export async function getAllUsers(): Promise<User[]> {
  const rows = await db.getAllAsync(
    `SELECT * FROM users ORDER BY created_at DESC`
  );

  return rows as User[];
}

/* -------------------------------------------------------
 * SEARCH USERS
 * -----------------------------------------------------*/

export async function searchUsers(query: string): Promise<User[]> {
  const q = `%${query}%`;

  const rows = await db.getAllAsync(
    `
    SELECT * FROM users
    WHERE name LIKE ? OR fayda_id LIKE ? OR phone LIKE ?
    ORDER BY name ASC
    `,
    [q, q, q]
  );

  return rows as User[];
}

/* -------------------------------------------------------
 * MARK USERS AS SYNCED
 * -----------------------------------------------------*/

export async function markUsersSynced(ids: string[]): Promise<void> {
  if (ids.length === 0) return;

  const placeholders = ids.map(() => "?").join(",");

  await db.runAsync(
    `UPDATE users SET sync_status = 'synced' WHERE fayda_id IN (${placeholders})`,
    ids
  );
}

/* -------------------------------------------------------
 * UPDATE USER
 * -----------------------------------------------------*/

export async function updateUser(
  fayda_id: string,
  updates: UserUpdate
): Promise<void> {
  const now = new Date().toISOString();

  await db.runAsync(
    `
    UPDATE users
    SET name = ?, gender = ?, phone = ?, address = ?, photo_uri = ?, updated_at = ?
    WHERE fayda_id = ?
    `,
    [
      updates.name,
      updates.gender ?? "",
      updates.phone ?? "",
      updates.address ?? "",
      updates.photo_uri ?? "",
      now,
      fayda_id,
    ]
  );

  await addCommit("update", "users", {
    fayda_id,
    ...updates
  });


}
