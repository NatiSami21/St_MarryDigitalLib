// church-library-app/utils/shift.ts

import { getShiftsForLibrarian } from "../db/queries/shifts";
import type { Shift } from "../db/queries/shifts";

/**
 * Returns the active shift for a librarian at the current time.
 * If no active shift exists, returns null.
 */
export async function getActiveShift(username: string) {
  const shifts: Shift[] = await getShiftsForLibrarian(username);
  if (!shifts.length) return null;

  const now = Date.now();

  for (const shift of shifts) {
    // start_time & end_time are stored as ISO strings
    const startTs = new Date(shift.start_time).getTime();
    const endTs = new Date(shift.end_time).getTime();

    if (now >= startTs && now <= endTs) {
      return {
        ...shift,
        startTs,
        endTs,
      };
    }
  }

  return null;
}

/**
 * Returns true if the librarian is currently inside an active shift.
 */
export async function isInsideShift(username: string): Promise<boolean> {
  return Boolean(await getActiveShift(username));
}

/**
 * Returns the end timestamp (ms) of the current active shift.
 * Used for auto-logout scheduling.
 */
export async function getShiftEndTime(
  username: string
): Promise<number | null> {
  const active = await getActiveShift(username);
  return active ? active.endTs : null;
}
