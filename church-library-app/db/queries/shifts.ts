// db/queries/shifts.ts
import { getAllAsync, runAsync } from "../sqlite";
import { addCommit } from "../commits";

export interface Shift {
  id: number;
  librarian_username: string;
  date: string;
  start_time: string;
  end_time: string;
  created_at: number;
  updated_at: number;
  deleted: number;
}

export interface ShiftAttendance {
  id: number;
  shift_id: number;
  librarian_username: string;
  clock_in: number | null;
  clock_out: number | null;
  status: string | null;
  synced: number;
}

export async function getShiftsByDate(date: string): Promise<Shift[]> {
  return await getAllAsync<Shift>(
    `SELECT * FROM shifts WHERE date = ? AND deleted = 0 ORDER BY start_time ASC`,
    [date]
  );
}

export async function getUpcomingShiftsForUser(username: string): Promise<Shift[]> {
  return await getAllAsync<Shift>(
    `SELECT * FROM shifts 
     WHERE librarian_username = ? 
     AND deleted = 0
     ORDER BY date ASC, start_time ASC`,
    [username]
  );
}

export async function createShift(shift: Omit<Shift, "id" | "deleted">) {
  await runAsync(
    `INSERT INTO shifts (librarian_username, date, start_time, end_time, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      shift.librarian_username,
      shift.date,
      shift.start_time,
      shift.end_time,
      shift.created_at,
      shift.updated_at
    ]
  );

  await addCommit("insert", "shifts", shift);
}

export async function deleteShift(id: number) {
  await runAsync(`UPDATE shifts SET deleted = 1 WHERE id = ?`, [id]);
  await addCommit("delete", "shifts", { id });
}

export async function updateShift(id: number, fields: Partial<Shift>) {
  const keys = Object.keys(fields);
  if (keys.length === 0) return;

  const set = keys.map(k => `${k} = ?`).join(", ");
  const values = Object.values(fields);

  await runAsync(
    `UPDATE shifts SET ${set} WHERE id = ?`,
    [...values, id]
  );

  await addCommit("update", "shifts", { id, ...fields });
}
