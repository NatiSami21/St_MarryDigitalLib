// church-library-app/utils/shift.ts
import { getShiftsForLibrarian } from "../db/queries/shifts";

export async function isInsideShift(username: string): Promise<boolean> {
  const shifts = await getShiftsForLibrarian(username);
  if (!shifts || shifts.length === 0) return false;

  const now = new Date();
  const today = now.toISOString().slice(0, 10); // YYYY-MM-DD
  const currentTime = now.toTimeString().slice(0, 5); // HH:mm

  for (const s of shifts) {
    // Type guard to ensure s has the expected properties
    if (
      typeof s === "object" &&
      s !== null &&
      "date" in s &&
      "start_time" in s &&
      "end_time" in s
    ) {
      const shift = s as { date: string; start_time: string; end_time: string };
      if (shift.date !== today) continue;

      if (currentTime >= shift.start_time && currentTime <= shift.end_time) {
        return true;
      }
    }
  }

  return false;
}
