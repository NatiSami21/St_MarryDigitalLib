// db/queries/attendance.ts
import { runAsync, getOneAsync, getAllAsync } from "../sqlite";
import { addCommit } from "../commits";

export interface ShiftAttendance {
  id: number;
  shift_id: number;
  librarian_username: string;
  clock_in: number | null;
  clock_out: number | null;
  status: string | null; // 'not_started' | 'in_progress' | 'completed'
  synced: number; // 0 | 1
  created_at?: number;
  updated_at?: number;
}

/**
 * Get attendance record for a specific shift and librarian (returns null if none)
 */
export async function getAttendanceForShift(
  shift_id: number,
  username: string
): Promise<ShiftAttendance | null> {
  return await getOneAsync<ShiftAttendance>(
    `SELECT * FROM shift_attendance WHERE shift_id = ? AND librarian_username = ? LIMIT 1`,
    [shift_id, username]
  );
}

/**
 * Get all attendance records for a given shift (useful for admin views)
 */
export async function getAttendanceByShift(shift_id: number): Promise<ShiftAttendance[]> {
  return await getAllAsync<ShiftAttendance>(
    `SELECT * FROM shift_attendance WHERE shift_id = ? ORDER BY id ASC`,
    [shift_id]
  );
}

/**
 * Get attendance history for a librarian (paginated/filtering can be added later)
 */
export async function getAttendancesForUser(username: string): Promise<ShiftAttendance[]> {
  return await getAllAsync<ShiftAttendance>(
    `SELECT * FROM shift_attendance WHERE librarian_username = ? ORDER BY id DESC`,
    [username]
  );
}

/**
 * Create attendance row (only if not exists). Marks status = 'not_started'
 */
export async function createAttendanceRecord(shift_id: number, username: string) {
  // If already exists, do nothing
  const existing = await getAttendanceForShift(shift_id, username);
  if (existing) return existing;

  const ts = Date.now();

  await runAsync(
    `INSERT INTO shift_attendance (shift_id, librarian_username, clock_in, clock_out, status, synced, created_at, updated_at)
     VALUES (?, ?, NULL, NULL, 'not_started', 0, ?, ?)`,
    [shift_id, username, ts, ts]
  );

  // add commit for sync engine
  await addCommit("insert", "shift_attendance", { shift_id, librarian_username: username, created_at: ts });

  return await getAttendanceForShift(shift_id, username);
}

/**
 * Clock in: set clock_in timestamp and status to 'in_progress'
 */
export async function clockIn(shift_id: number, username: string) {
  const ts = Date.now();

  await runAsync(
    `UPDATE shift_attendance
     SET clock_in = ?, status = 'in_progress', updated_at = ?
     WHERE shift_id = ? AND librarian_username = ?`,
    [ts, ts, shift_id, username]
  );

  await addCommit("clock_in", "shift_attendance", {
    shift_id,
    librarian_username: username,
    clock_in: ts,
  });
}

/**
 * Clock out: set clock_out timestamp and status to 'completed'
 */
export async function clockOut(shift_id: number, username: string) {
  const ts = Date.now();

  await runAsync(
    `UPDATE shift_attendance
     SET clock_out = ?, status = 'completed', updated_at = ?
     WHERE shift_id = ? AND librarian_username = ?`,
    [ts, ts, shift_id, username]
  );

  await addCommit("clock_out", "shift_attendance", {
    shift_id,
    librarian_username: username,
    clock_out: ts,
  });
}
