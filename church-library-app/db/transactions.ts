// db/transactions.ts

import { db } from "./sqlite";
import { randomUUID } from "expo-crypto";
import type { Book } from "../types/Book"; 

export type Transaction = {
  tx_id: string;
  book_code: string;
  fayda_id: string;
  borrowed_at: string;
  returned_at?: string | null;
  device_id: string;
  sync_status: string;
};

// ---------------------------------------------
// 1. Borrow Book
// ---------------------------------------------
export async function borrowBook(fayda_id: string, book_code: string) {
  const now = new Date().toISOString();

  // 1. Check user exists
  const user = await db.getFirstAsync(
    `SELECT * FROM users WHERE fayda_id = ?`,
    [fayda_id]
  );
  if (!user) throw new Error("User not found.");

  // 2. Check book exists
  const book = await db.getFirstAsync<Book>(
    `SELECT * FROM books WHERE book_code = ?`,
    [book_code]
  );
  if (!book) throw new Error("Book not found.");

  // 3. Check copies available
  if (book.copies < 1) {
    throw new Error("No copies of this book are currently available.");
  }

  // 4. Check active borrow exists
  const active = await db.getFirstAsync(
    `SELECT * FROM transactions
     WHERE fayda_id = ? AND book_code = ? AND returned_at IS NULL`,
    [fayda_id, book_code]
  );

  if (active) {
    throw new Error("This user already borrowed this book and has not returned it.");
  }

  // 5. Create new transaction
  const tx_id = randomUUID();

  await db.runAsync(
    `INSERT INTO transactions 
     (tx_id, book_code, fayda_id, borrowed_at, returned_at, device_id, sync_status)
     VALUES (?, ?, ?, ?, NULL, ?, 'pending')`,
    [tx_id, book_code, fayda_id, now, "device-1"]
  );

  // 6. Reduce available copies
  await db.runAsync(
    `UPDATE books SET copies = copies - 1, updated_at = ? WHERE book_code = ?`,
    [now, book_code]
  );

  return tx_id;
}

// ---------------------------------------------
// 2. Get Active Borrow (if any)
// ---------------------------------------------
export async function getActiveBorrow(fayda_id: string, book_code: string) {
  const tx = await db.getFirstAsync(
    `SELECT * FROM transactions
     WHERE fayda_id = ? AND book_code = ? AND returned_at IS NULL`,
    [fayda_id, book_code]
  );

  return tx || null;
}

// ---------------------------------------------
// 3. List all borrows for a user
// ---------------------------------------------
export async function getUserBorrows(fayda_id: string) {
  return await db.getAllAsync(
    `SELECT * FROM transactions
     WHERE fayda_id = ?
     ORDER BY borrowed_at DESC`,
    [fayda_id]
  );
}
