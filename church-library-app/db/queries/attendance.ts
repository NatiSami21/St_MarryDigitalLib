// db/queries/attendance.ts
import { runAsync } from "../sqlite";
import { addCommit } from "../commits";

export async function createAttendanceRecord(shift_id: number, username: string) {
  await runAsync(
    `INSERT INTO shift_attendance (shift_id, librarian_username)
     VALUES (?, ?)`,
    [shift_id, username]
  );

  await addCommit("insert", "shift_attendance", { shift_id, username });
}

export async function clockIn(shift_id: number, username: string) {
  const ts = Date.now();

  await runAsync(
    `UPDATE shift_attendance 
     SET clock_in = ?, status = 'in_progress'
     WHERE shift_id = ? AND librarian_username = ?`,
    [ts, shift_id, username]
  );

  await addCommit("clock_in", "shift_attendance", {
    shift_id,
    librarian_username: username,
    clock_in: ts
  });
}

export async function clockOut(shift_id: number, username: string) {
  const ts = Date.now();

  await runAsync(
    `UPDATE shift_attendance 
     SET clock_out = ?, status = 'completed'
     WHERE shift_id = ? AND librarian_username = ?`,
    [ts, shift_id, username]
  );

  await addCommit("clock_out", "shift_attendance", {
    shift_id,
    librarian_username: username,
    clock_out: ts
  });
}
