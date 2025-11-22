// db/transactions.ts

import { db } from './sqlite';
import { v4 as uuid } from 'uuid';

// Record a borrow transaction
export const borrowBook = (book_code: string, fayda_id: string, device_id: string) => {
  const tx_id = uuid();
  const timestamp = new Date().toISOString();

  try {
    db.execSync(`
      INSERT INTO transactions (tx_id, book_code, fayda_id, type, timestamp, device_id, sync_status)
      VALUES ('${tx_id}', '${book_code}', '${fayda_id}', 'borrow', '${timestamp}', '${device_id}', 'pending');
    `);
    return tx_id;
  } catch (error) {
    console.error('❌ Error recording borrow:', error);
    throw error;
  }
};

// Record a return transaction
export const returnBook = (book_code: string, device_id: string) => {
  const tx_id = uuid();
  const timestamp = new Date().toISOString();

  try {
    db.execSync(`
      INSERT INTO transactions (tx_id, book_code, fayda_id, type, timestamp, device_id, sync_status)
      VALUES ('${tx_id}', '${book_code}', '', 'return', '${timestamp}', '${device_id}', 'pending');
    `);
    return tx_id;
  } catch (error) {
    console.error('❌ Error recording return:', error);
    throw error;
  }
};

// Fetch unreturned books
export const listUnreturnedBooks = () => {
  try {
    return db.getAllSync(`
      SELECT b.title, b.book_code, t.timestamp AS borrowed_at, t.fayda_id
      FROM transactions t
      JOIN books b ON b.book_code = t.book_code
      WHERE t.type='borrow'
      AND NOT EXISTS (
        SELECT 1 FROM transactions r
        WHERE r.book_code=t.book_code AND r.type='return' AND r.timestamp > t.timestamp
      )
      ORDER BY t.timestamp ASC;
    `);
  } catch (error) {
    console.error('❌ Error fetching unreturned books:', error);
    return [];
  }
};

// Get pending transactions (for sync)
export const listPendingTransactions = () => {
  try {
    return db.getAllSync(`SELECT * FROM transactions WHERE sync_status='pending';`);
  } catch (error) {
    console.error('❌ Error getting pending transactions:', error);
    return [];
  }
};

// Mark transactions as synced
export const markTransactionsSynced = (ids: string[]) => {
  try {
    const str = ids.map(i => `'${i}'`).join(',');
    db.execSync(`UPDATE transactions SET sync_status='synced' WHERE tx_id IN (${str});`);
  } catch (error) {
    console.error('❌ Error marking transactions synced:', error);
  }
};
