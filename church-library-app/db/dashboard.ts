// db/dashboard.ts
import { db } from "./sqlite";

/**
 * Dashboard statistics helper functions.
 *
 * NOTE: uses localtime on date() calls so counts align with device local date.
 */

export type DashboardStats = {
  totalBooks: number;
  totalUsers: number;
  totalCopies: number;
  availableCopies: number; // sum of copies column
  activeBorrows: number; // transactions with returned_at IS NULL
  returnedToday: number; // returned_at date == today
  returnedThisMonth: number; // returned_at month == this month
  overdueCount: number; // borrowed_at older than 14 days and returned_at IS NULL
};

export async function getDashboardStats(): Promise<DashboardStats> {
  // total books
  const tb: any = await db.getFirstAsync(`SELECT COUNT(1) AS cnt FROM books;`);
  const totalBooks = tb?.cnt ?? 0;

  // sum of copies (total physical copies)
  const copiesRow: any = await db.getFirstAsync(`SELECT IFNULL(SUM(copies), 0) AS totalCopies FROM books;`);
  const totalCopies = copiesRow?.totalCopies ?? 0;

  // active borrows (returned_at IS NULL)
  const ab: any = await db.getFirstAsync(
    `SELECT COUNT(1) AS cnt FROM transactions WHERE returned_at IS NULL;`
  );
  const activeBorrows = ab?.cnt ?? 0;

  // returned today (local date)
  const rt: any = await db.getFirstAsync(
    `SELECT COUNT(1) AS cnt FROM transactions WHERE returned_at IS NOT NULL AND date(returned_at) = date('now','localtime');`
  );
  const returnedToday = rt?.cnt ?? 0;

  // returned this month
  const rtm: any = await db.getFirstAsync(
    `SELECT COUNT(1) AS cnt FROM transactions WHERE returned_at IS NOT NULL AND strftime('%Y-%m', returned_at) = strftime('%Y-%m','now','localtime');`
  );
  const returnedThisMonth = rtm?.cnt ?? 0;

  // overdue: borrowed_at older than 14 days and not returned
  const ov: any = await db.getFirstAsync(
    `SELECT COUNT(1) AS cnt FROM transactions
     WHERE returned_at IS NULL
       AND date(borrowed_at) <= date('now','-14 days','localtime');`
  );
  const overdueCount = ov?.cnt ?? 0;

  // available copies = totalCopies - activeBorrows
  // (note: this is a rough number: if you decrement copies on borrow and increment on return,
  // you could simply SUM copies column for real-time availability. Here we assume books.copies is current.)
  // We'll return both totalCopies (sum of copies) and a derived availableCopies.
  const availableCopies = Math.max(0, totalCopies - activeBorrows);

  // total users
  const u: any = await db.getFirstAsync(`SELECT COUNT(1) AS cnt FROM users;`);
  const totalUsers = u?.cnt ?? 0;

  return {
    totalBooks,
    totalUsers,
    totalCopies,
    availableCopies,
    activeBorrows,
    returnedToday,
    returnedThisMonth,
    overdueCount,
  };
}
