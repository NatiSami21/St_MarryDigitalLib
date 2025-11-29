// /reports/generate.ts
import { db } from "../db/sqlite";

export type ReportRange = "daily" | "weekly" | "monthly" | "yearly";

// Define types for database results
interface CountResult {
  total: number;
}

interface TopBook {
  title: string;
  author: string;
  times: number;
}

interface InventoryItem {
  book_code: string;
  title: string;
  author: string;
  copies: number;
  borrowed_now: number;
}

function getDateRange(mode: ReportRange) {
  const now = new Date();
  let start = new Date();

  switch (mode) {
    case "daily":
      start.setHours(0, 0, 0, 0);
      break;
    case "weekly":
      start.setDate(now.getDate() - 7);
      break;
    case "monthly":
      start.setMonth(now.getMonth() - 1);
      break;
    case "yearly":
      start.setFullYear(now.getFullYear() - 1);
      break;
  }

  return {
    startISO: start.toISOString(),
    endISO: now.toISOString(),
  };
}

export async function generateReport(mode: ReportRange) {
  const { startISO, endISO } = getDateRange(mode);

  // ---------------------------------------------------
  // BASIC COUNTS
  // ---------------------------------------------------
  const borrowCount = await db.getFirstAsync<CountResult>(
    `SELECT COUNT(*) AS total FROM transactions 
     WHERE borrowed_at BETWEEN ? AND ?`,
    [startISO, endISO]
  );

  const returnCount = await db.getFirstAsync<CountResult>(
    `SELECT COUNT(*) AS total FROM transactions 
     WHERE returned_at IS NOT NULL
     AND returned_at BETWEEN ? AND ?`,
    [startISO, endISO]
  );

  const activeCount = await db.getFirstAsync<CountResult>(
    `SELECT COUNT(*) AS total FROM transactions 
     WHERE returned_at IS NULL`,
    []
  );

  // Overdue = not returned & borrowed_at older than 14 days
  const overdueCount = await db.getFirstAsync<CountResult>(
    `SELECT COUNT(*) AS total FROM transactions
     WHERE returned_at IS NULL
     AND borrowed_at <= datetime('now', '-14 days')`
  );

  // ---------------------------------------------------
  // TOP BORROWED BOOKS
  // ---------------------------------------------------
  const topBooks = await db.getAllAsync<TopBook>(
    `SELECT books.title, books.author, COUNT(transactions.tx_id) AS times
     FROM transactions
     JOIN books ON books.book_code = transactions.book_code
     WHERE transactions.borrowed_at BETWEEN ? AND ?
     GROUP BY books.book_code
     ORDER BY times DESC
     LIMIT 10`,
    [startISO, endISO]
  );

  // ---------------------------------------------------
  // PER-BOOK INVENTORY SUMMARY
  // ---------------------------------------------------
  const inventory = await db.getAllAsync<InventoryItem>(`
    SELECT 
      b.book_code,
      b.title,
      b.author,
      b.copies,
      (SELECT COUNT(*) 
       FROM transactions t 
       WHERE t.book_code = b.book_code AND t.returned_at IS NULL
      ) AS borrowed_now
    FROM books b
    ORDER BY b.title ASC
  `);

  // ---------------------------------------------------
  // BUILD CSV
  // ---------------------------------------------------
  let csv = "";
  csv += `Library Report (${mode.toUpperCase()})\n`;
  csv += `Generated At,${new Date().toISOString()}\n\n`;

  csv += "Section,Value\n";
  csv += `Borrow Count,${borrowCount?.total ?? 0}\n`;
  csv += `Return Count,${returnCount?.total ?? 0}\n`;
  csv += `Active Borrows,${activeCount?.total ?? 0}\n`;
  csv += `Overdue,${overdueCount?.total ?? 0}\n\n`;

  csv += "Top Borrowed Books\n";
  csv += "Title,Author,Borrows\n";
  topBooks.forEach((b: TopBook) => {
    csv += `${b.title},${b.author},${b.times}\n`;
  });
  csv += "\n";

  csv += "Inventory Summary\n";
  csv += "Code,Title,Author,Copies Available,Borrowed Now\n";
  inventory.forEach((b: InventoryItem) => {
    csv += `${b.book_code},${b.title},${b.author},${b.copies},${b.borrowed_now}\n`;
  });

  const fileName = `library-report-${mode}-${Date.now()}.csv`;

  return { fileName, csv };
}