// db/transactions.ts

import { db } from "./sqlite";
import { randomUUID } from "expo-crypto";
import type { Book } from "../types/Book"; 

import { appendCommit } from "./commits";
import { runAsync } from "./sqlite";
import { getLibrarianByUsername } from "./queries/librarians";

import { addCommit } from "./commits";
import { getSession } from "../lib/session";


export type Transaction = {
  tx_id: string;
  book_code: string;
  title: string;
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
    throw new Error("No copies available.");
  }

  // 4. Check active borrow exists
  const active = await db.getFirstAsync(
    `SELECT * FROM transactions
     WHERE fayda_id = ? AND book_code = ? AND returned_at IS NULL`,
    [fayda_id, book_code]
  );
  if (active) {
    throw new Error("User already borrowed this book and hasn't returned it.");
  }

  // 5. Load session + librarian info
  const session = await getSession();
  const librarian = session ? await getLibrarianByUsername(session.username) : null;

  const librarian_username = session?.username ?? "unknown";
  const device_id = librarian?.device_id ?? "unknown-device";

  // 6. Create new transaction
  const tx_id = randomUUID();

  await db.runAsync(
    `INSERT INTO transactions 
     (tx_id, book_code, fayda_id, borrowed_at, returned_at, device_id, sync_status)
     VALUES (?, ?, ?, ?, NULL, ?, 'pending')`,
    [tx_id, book_code, fayda_id, now, device_id]
  );

  // 7. Update stock
  await db.runAsync(
    `UPDATE books SET copies = copies - 1, updated_at = ? WHERE book_code = ?`,
    [now, book_code]
  );
  

  await addCommit("update", "books", {
    book_code,
    copies: book.copies - 1,
    updated_at: now
  });
  

  // 8. Append readable commit (for admin UI)
  try {
    await appendCommit({
      librarian_username,
      device_id,
      type: "borrow_book",
      payload: { fayda_id, book_code, tx_id }
    });
  } catch (e) {
    console.warn("⚠️ Commit failed, continuing locally", e);
  }

  // 9. Add pending commit (for sync engine)
  await addCommit("insert", "transactions", {
    tx_id,
    fayda_id,
    book_code,
    borrowed_at: now
  });

  return tx_id;
}


// ---------------------------------------------
// 2. Get Active Borrow (if any)
// ---------------------------------------------
export async function getActiveBorrow(fayda_id: string, book_code: string) {
  const tx = await db.getFirstAsync<Transaction>(
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
  return await db.getAllAsync<Transaction>(
    `SELECT * FROM transactions
     WHERE fayda_id = ?
     ORDER BY borrowed_at DESC`,
    [fayda_id]
  );
}
// ---------------------------------------------
// 4. Complete Return (PATCHED)
// ---------------------------------------------
export interface ReturnArgs {
  tx_id: string;
  book_code: string;
  librarian_username: string;
  device_id: string;
}

export async function completeReturn({
  tx_id,
  book_code,
  librarian_username,
  device_id
}: ReturnArgs): Promise<boolean> {

  console.log("RETURN PARAMS", {
    tx_id,
    book_code,
    librarian_username,
    device_id
  });


  const now = new Date().toISOString();

  // 🔍 Verify transaction exists and is not returned
  const tx = await db.getFirstAsync(
    `
    SELECT tx_id FROM transactions
    WHERE tx_id = ? AND returned_at IS NULL
    `,
    [tx_id]
  );

  if (!tx) {
    console.warn("⚠️ completeReturn: tx already returned or not found", tx_id);
    return false;
  }

  // ✅ Mark transaction as returned
  await runAsync(
    `
    UPDATE transactions
    SET returned_at = ?, sync_status = 'pending'
    WHERE tx_id = ?
    `,
    [now, tx_id]
  );

  // 📚 Restore book stock
  const book = await db.getFirstAsync<Book>(
    `SELECT * FROM books WHERE book_code = ?`,
    [book_code]
  );

  await runAsync(
    `
    UPDATE books
    SET copies = copies + 1, updated_at = ?
    WHERE book_code = ?
    `,
    [now, book_code]
  );

  // 🔥 Commit book update
  await addCommit("update", "books", {
    book_code,
    copies: (book?.copies ?? 0) + 1,
    updated_at: now
  });

  // 📦 Append transaction commit
  try {
    await appendCommit({
      librarian_username,
      device_id,
      type: "return_book",
      payload: { tx_id, book_code }
    });
  } catch (e) {
    console.warn("⚠️ Commit failed, continuing locally", e);
  }

  return true;
}


// ---------------------------------------------
// 5. List ALL transactions
// ---------------------------------------------
export async function getAllTransactions() {
  return await db.getAllAsync(`
    SELECT 
      t.*, 
      b.title AS book_title,
      u.name AS user_name
    FROM transactions t
    LEFT JOIN books b ON t.book_code = b.book_code
    LEFT JOIN users u ON t.fayda_id = u.fayda_id
    ORDER BY t.borrowed_at DESC
  `);
}

// ---- Active Transactions ----
export async function getActiveTransactions() {
  return await db.getAllAsync(`
    SELECT 
      t.*, 
      b.title AS book_title,
      u.name AS user_name
    FROM transactions t
    LEFT JOIN books b ON t.book_code = b.book_code
    LEFT JOIN users u ON t.fayda_id = u.fayda_id
    WHERE t.returned_at IS NULL
    ORDER BY t.borrowed_at DESC
  `);
}

// ---- Returned Transactions ----
export async function getReturnedTransactions() {
  return await db.getAllAsync(`
    SELECT 
      t.*, 
      b.title AS book_title,
      u.name AS user_name
    FROM transactions t
    LEFT JOIN books b ON t.book_code = b.book_code
    LEFT JOIN users u ON t.fayda_id = u.fayda_id
    WHERE t.returned_at IS NOT NULL
    ORDER BY t.borrowed_at DESC
  `);
}

// ---------------------------------------------
// 8. Get per-user history
// ---------------------------------------------
export async function getUserHistory(fayda_id: string) {
  return await db.getAllAsync(
    `
    SELECT 
      t.*, 
      b.title AS book_title
    FROM transactions t
    LEFT JOIN books b ON t.book_code = b.book_code
    WHERE t.fayda_id = ?
    ORDER BY t.borrowed_at DESC
    `,
    [fayda_id]
  );
}

// ---------------------------------------------
// LIST ALL BORROWS FOR A BOOK
// ---------------------------------------------
export async function getBookHistory(book_code: string) {
  return await db.getAllAsync(
    `
    SELECT
      t.*,
      u.name AS user_name,
      b.title AS book_title
    FROM transactions t
    LEFT JOIN users u ON t.fayda_id = u.fayda_id
    LEFT JOIN books b ON t.book_code = b.book_code
    WHERE t.book_code = ?
    ORDER BY t.borrowed_at DESC
    `,
    [book_code]
  );
}
