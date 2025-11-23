import { db } from './sqlite';
import { v4 as uuidv4 } from 'uuid';

export const borrowBook = async (book_code: string, fayda_id: string, device_id: string) => {
  const tx_id = uuidv4();
  const timestamp = new Date().toISOString();

  await db.runAsync(
    `INSERT INTO transactions (tx_id, book_code, fayda_id, type, timestamp, device_id, sync_status)
     VALUES (?, ?, ?, 'borrow', ?, ?, ?)`,
    [tx_id, book_code, fayda_id, timestamp, device_id, 'pending']
  );

  return tx_id;
};

export const returnBook = async (book_code: string, device_id: string) => {
  const tx_id = uuidv4();
  const timestamp = new Date().toISOString();

  await db.runAsync(
    `INSERT INTO transactions (tx_id, book_code, fayda_id, type, timestamp, device_id, sync_status)
     VALUES (?, ?, NULL, 'return', ?, ?, ?)`,
    [tx_id, book_code, timestamp, device_id, 'pending']
  );

  return tx_id;
};

export const listUnreturnedBooks = async () => {
  return await db.getAllAsync(`
    SELECT b.title, b.book_code, t.timestamp AS borrowed_at, t.fayda_id
    FROM transactions t
    JOIN books b ON b.book_code = t.book_code
    WHERE t.type='borrow'
    AND NOT EXISTS (
      SELECT 1 FROM transactions r
      WHERE r.book_code=t.book_code AND r.type='return' AND r.timestamp > t.timestamp
    )
    ORDER BY t.timestamp ASC
  `);
};

export const listPendingTransactions = async () => {
  return await db.getAllAsync(
    `SELECT * FROM transactions WHERE sync_status='pending'`
  );
};

export const markTransactionsSynced = async (ids: string[]) => {
  if (ids.length === 0) return;
  const placeholders = ids.map(() => '?').join(',');
  await db.runAsync(
    `UPDATE transactions SET sync_status='synced' WHERE tx_id IN (${placeholders})`,
    ids
  );
};
