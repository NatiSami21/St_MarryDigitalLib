// supabase/functions/shared/shift.ts

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

/**
 * Check whether a timestamp is inside ANY valid shift
 * for the given librarian username.
 *
 * Server-authoritative enforcement.
 */
export async function isTimestampInsideShift(
  username: string,
  timestamp: number
): Promise<boolean> {
  const date = new Date(timestamp);

  const shiftDate = date.toISOString().slice(0, 10); // YYYY-MM-DD
  const time = date.toTimeString().slice(0, 5); // HH:mm

  const { data: shifts, error } = await supabase
    .from("shifts")
    .select("date, start_time, end_time")
    .eq("librarian_username", username)
    .eq("date", shiftDate);

  if (error) {
    console.error("❌ Shift query failed:", error);
    return false;
  }

  if (!shifts || shifts.length === 0) {
    return false;
  }

  for (const shift of shifts) {
    if (
      time >= shift.start_time &&
      time <= shift.end_time
    ) {
      return true;
    }
  }

  return false;
}
