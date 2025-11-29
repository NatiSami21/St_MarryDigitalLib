import { db } from './sqlite'; 
import { randomUUID } from "expo-crypto";


type BookInput = {
  title: string;
  author: string;
  category: string;
  notes?: string;
  copies?: number;
};

export const addBook = async (book: BookInput) => { 
  const book_code = randomUUID();

  const now = new Date().toISOString();

  await db.runAsync(
    `INSERT INTO books (book_code, title, author, category, notes, copies, created_at, updated_at, sync_status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      book_code,
      book.title,
      book.author,
      book.category,
      book.notes ?? '',
      book.copies ?? 1,
      now,
      now,
      'pending',
    ]
  );

  return book_code;
};

export const getBook = async (book_code: string) => {
  return await db.getFirstAsync(
    `SELECT * FROM books WHERE book_code = ?`,
    [book_code]
  );
};

export const listBooks = async () => {
  return await db.getAllAsync(`SELECT * FROM books ORDER BY created_at DESC`);
};

export const getAllBooks = async () => {
  return await db.getAllAsync(`SELECT * FROM books ORDER BY title ASC`);
};

export const searchBooks = async (query: string) => {
  const q = `%${query}%`;
  return await db.getAllAsync(
    `SELECT * FROM books WHERE title LIKE ? OR author LIKE ? OR category LIKE ? ORDER BY title ASC`,
    [q, q, q]
  );
};

export const markBooksSynced = async (codes: string[]) => {
  if (codes.length === 0) return;
  const placeholders = codes.map(() => '?').join(',');
  await db.runAsync(
    `UPDATE books SET sync_status = 'synced' WHERE book_code IN (${placeholders})`,
    codes
  );
};

export async function getBookByCode(code: string) {
  return await db.getFirstAsync(
    `SELECT * FROM books WHERE book_code = ?`,
    [code]
  );
}

// Get full inventory with borrowed_now
export async function getInventory() {
  return await db.getAllAsync(`
    SELECT 
      b.book_code,
      b.title,
      b.author,
      b.category,
      b.copies AS total_copies,
      (
        SELECT COUNT(*) 
        FROM transactions t 
        WHERE t.book_code = b.book_code AND t.returned_at IS NULL
      ) AS borrowed_now
    FROM books b
    ORDER BY b.title ASC
  `);
}

// Search inventory by title/author/category/code
export async function searchInventory(query: string) {
  const like = `%${query}%`;
  return await db.getAllAsync(
    `
    SELECT 
      b.book_code,
      b.title,
      b.author,
      b.category,
      b.copies AS total_copies,
      (
        SELECT COUNT(*) 
        FROM transactions t 
        WHERE t.book_code = b.book_code AND t.returned_at IS NULL
      ) AS borrowed_now
    FROM books b
    WHERE b.title LIKE ?
       OR b.author LIKE ?
       OR b.category LIKE ?
       OR b.book_code LIKE ?
    ORDER BY b.title ASC
    `,
    [like, like, like, like]
  );
}