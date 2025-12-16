// db/queries/attendance.ts

import { runAsync, getOneAsync, getAllAsync } from "../sqlite";
import { addCommit } from "../commits";

export interface ShiftAttendance {
  id: number;
  shift_id: number;
  librarian_username: string;
  clock_in: number | null;
  clock_out: number | null;
  status: string | null;  
  created_at: number;      
  updated_at: number;  
  synced: number; // 0 | 1
}

/* --------------------------------------------------
 * Fetch helpers
 * --------------------------------------------------*/

export async function getAttendanceForShift(
  shift_id: number,
  username: string
): Promise<ShiftAttendance | null> {
  return await getOneAsync<ShiftAttendance>(
    `SELECT * FROM shift_attendance
     WHERE shift_id = ? AND librarian_username = ?
     LIMIT 1`,
    [shift_id, username]
  );
}

export async function getAttendancesForUser(
  username: string
): Promise<ShiftAttendance[]> {
  return await getAllAsync<ShiftAttendance>(
    `SELECT * FROM shift_attendance
     WHERE librarian_username = ?
     ORDER BY id DESC`,
    [username]
  );
}

export async function getAttendanceByShift(
  shift_id: number
): Promise<ShiftAttendance[]> {
  return await getAllAsync<ShiftAttendance>(
    `SELECT * FROM shift_attendance
     WHERE shift_id = ?
     ORDER BY id ASC`,
    [shift_id]
  );
}

/* --------------------------------------------------
 * Core writers
 * --------------------------------------------------*/

/**
 * Ensure attendance row exists (NO clock-in here)
 */
export async function ensureAttendanceRow(
  shift_id: number,
  username: string
): Promise<ShiftAttendance> {
  let att = await getAttendanceForShift(shift_id, username);
  if (att) return att;

  await runAsync(
    `INSERT INTO shift_attendance
      (shift_id, librarian_username, clock_in, clock_out, status, synced)
     VALUES (?, ?, NULL, NULL, 'not_started', 0)`,
    [shift_id, username]
  );

  await addCommit("insert", "shift_attendance", {
    shift_id,
    librarian_username: username,
  });

  const created = await getAttendanceForShift(shift_id, username);
  if (!created) {
    throw new Error("Failed to create attendance record");
  }

  return created;
}

/**
 * 🔐 IMPLICIT CLOCK-IN (used ONLY on login)
 */
export async function implicitClockIn(
  shift_id: number,
  username: string,
  shiftStartTs: number
) {
  const now = Date.now();

  const att = await ensureAttendanceRow(shift_id, username);

  // Prevent double clock-in
  if (att.clock_in) return;

  const status = now <= shiftStartTs ? "on_time" : "late";

  await runAsync(
    `UPDATE shift_attendance
     SET clock_in = ?, status = ?
     WHERE shift_id = ? AND librarian_username = ?`,
    [now, status, shift_id, username]
  );

  await addCommit("clock_in", "shift_attendance", {
    shift_id,
    librarian_username: username,
    clock_in: now,
    status,
  });
}

/**
 * ⏱ AUTO CLOCK-OUT (used by shift end watcher)
 */
export async function autoClockOut(
  shift_id: number,
  username: string
) {
  const now = Date.now();

  const att = await getAttendanceForShift(shift_id, username);
  if (!att) return;

  // already clocked out → nothing to do
  if (att.clock_out) return;

  await runAsync(
    `UPDATE shift_attendance
     SET clock_out = ?, status = 'completed'
     WHERE shift_id = ? AND librarian_username = ?`,
    [now, shift_id, username]
  );

  await addCommit("clock_out", "shift_attendance", {
    shift_id,
    librarian_username: username,
    clock_out: now,
    status: "completed",
  });
}
