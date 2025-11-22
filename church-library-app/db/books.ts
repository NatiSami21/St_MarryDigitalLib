// db/books.ts

import { db } from './sqlite';
import { v4 as uuid } from 'uuid';

// Add a new book
export const addBook = async (book: {
  title: string;
  author: string;
  category: string;
  notes?: string;
  copies?: number;
}) => {
  const book_code = uuid();
  const created_at = new Date().toISOString();
  const updated_at = created_at;

  try {
    db.execSync(
      `INSERT INTO books (book_code, title, author, category, notes, copies, created_at, updated_at, sync_status)
       VALUES ('${book_code}', '${book.title}', '${book.author}', '${book.category}', '${book.notes ?? ''}', 
               ${book.copies ?? 1}, '${created_at}', '${updated_at}', 'pending');`
    );
    return book_code;
  } catch (error) {
    console.error('❌ Error adding book:', error);
    throw error;
  }
};

// Get book by book_code
export const getBook = (book_code: string) => {
  try {
    const result = db.getFirstSync(
      `SELECT * FROM books WHERE book_code = ?;`,
      [book_code]
    );
    return result ?? null;
  } catch (error) {
    console.error('❌ Error getting book:', error);
    return null;
  }
};

// List all books
export const listBooks = () => {
  try {
    const result = db.getAllSync(`SELECT * FROM books ORDER BY created_at DESC;`);
    return result ?? [];
  } catch (error) {
    console.error('❌ Error listing books:', error);
    return [];
  }
};

// Mark books as synced
export const markBooksSynced = (codes: string[]) => {
  try {
    const codeList = codes.map(c => `'${c}'`).join(',');
    db.execSync(
      `UPDATE books SET sync_status = 'synced' WHERE book_code IN (${codeList});`
    );
  } catch (error) {
    console.error('❌ Error marking books synced:', error);
  }
};
