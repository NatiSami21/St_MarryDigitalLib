// db/users.ts

import { db } from './sqlite';

// Add or update a user
export const upsertUser = async (user: {
  fayda_id: string;
  name: string;
  phone?: string;
  photo_uri?: string;
}) => {
  const timestamp = new Date().toISOString();

  try {
    db.execSync(`
      INSERT INTO users (fayda_id, name, phone, photo_uri, created_at, updated_at, sync_status)
      VALUES ('${user.fayda_id}', '${user.name}', '${user.phone ?? ''}', '${user.photo_uri ?? ''}',
              '${timestamp}', '${timestamp}', 'pending')
      ON CONFLICT(fayda_id)
      DO UPDATE SET
        name='${user.name}',
        phone='${user.phone ?? ''}',
        photo_uri='${user.photo_uri ?? ''}',
        updated_at='${timestamp}',
        sync_status='pending';
    `);
  } catch (error) {
    console.error('❌ Error upserting user:', error);
    throw error;
  }
};

// Get user by Fayda ID
export const getUser = (fayda_id: string) => {
  try {
    return db.getFirstSync(
      `SELECT * FROM users WHERE fayda_id = ?;`,
      [fayda_id]
    );
  } catch (error) {
    console.error('❌ Error getting user:', error);
    return null;
  }
};

// List all users
export const listUsers = () => {
  try {
    return db.getAllSync(`SELECT * FROM users ORDER BY created_at DESC;`);
  } catch (error) {
    console.error('❌ Error listing users:', error);
    return [];
  }
};

// Mark users as synced
export const markUsersSynced = (ids: string[]) => {
  try {
    const list = ids.map(id => `'${id}'`).join(',');
    db.execSync(`UPDATE users SET sync_status = 'synced' WHERE fayda_id IN (${list});`);
  } catch (error) {
    console.error('❌ Error marking users synced:', error);
  }
};
