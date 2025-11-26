import { db } from './sqlite';

type UserInput = {
  fayda_id: string;
  name: string;
  phone?: string;
  photo_uri?: string;
};

export const upsertUser = async (user: {
  fayda_id: string;
  name: string;
  phone?: string;
  gender?: string;
  address?: string;
  photo_uri?: string;
}) => {
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
};

export const getUser = async (fayda_id: string) => {
  return await db.getFirstAsync(
    `SELECT * FROM users WHERE fayda_id = ?`,
    [fayda_id]
  );
};

export const listUsers = async () => {
  return await db.getAllAsync(`SELECT * FROM users ORDER BY created_at DESC`);
};

export const markUsersSynced = async (ids: string[]) => {
  if (ids.length === 0) return;
  const placeholders = ids.map(() => '?').join(',');
  await db.runAsync(
    `UPDATE users SET sync_status = 'synced' WHERE fayda_id IN (${placeholders})`,
    ids
  );
};

export async function getAllUsers() {
  return await db.getAllAsync(`SELECT * FROM users ORDER BY created_at DESC`);
}

export async function searchUsers(query: string) {
  const q = `%${query}%`;
  return await db.getAllAsync(
    `
    SELECT * FROM users
    WHERE name LIKE ? OR fayda_id LIKE ? OR phone LIKE ?
    ORDER BY name ASC
    `,
    [q, q, q]
  );
}
