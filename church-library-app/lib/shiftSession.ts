// church-library-app/lib/shiftSession.ts

import { Alert } from "react-native";
import { clearSession, getSession } from "./session";

import { autoClockOut } from "../db/queries/attendance";
import { getActiveShift } from "../utils/shift";

let logoutTimer: ReturnType<typeof setTimeout> | null = null;

/**
 * Schedule automatic logout when shift ends.
 * Librarian only:
 *  - auto clock-out (implicit)
 *  - commit queued for sync
 */
export function scheduleShiftLogout(
  shiftEndTime: number,
  onLogout?: () => void
) {
  clearShiftLogout();

  const now = Date.now();
  const delay = shiftEndTime - now;

  if (delay <= 0) {
    // Shift already ended
    void handleForcedLogout("Your shift has ended.", onLogout);
    return;
  }

  logoutTimer = setTimeout(async () => {
    await handleForcedLogout(
      "Your shift has ended. You have been logged out.",
      onLogout
    );
  }, delay);

  console.log(`⏱ Shift auto-logout scheduled in ${Math.round(delay / 1000)}s`);
}

/**
 * Clears any scheduled shift logout.
 */
export function clearShiftLogout() {
  if (logoutTimer !== null) {
    clearTimeout(logoutTimer);
    logoutTimer = null;
    console.log("🧹 Shift auto-logout cleared");
  }
}

/* --------------------------------------------------
 * INTERNAL — forced logout handler
 * --------------------------------------------------*/
async function handleForcedLogout(
  message: string,
  onLogout?: () => void
) {
  try {
    const session = await getSession();

    // 🔐 Librarian auto clock-out (implicit)
    if (session?.role === "librarian") {
      const shift = await getActiveShift(session.username);

      if (shift) {
        // ✅ GUARANTEED COMMIT
        await autoClockOut(shift.id, session.username);
      }
    }
  } catch (err) {
    console.error("Auto clock-out failed:", err);
  } finally {
    await clearSession();

    Alert.alert("Session Ended", message, [{ text: "OK" }]);

    onLogout?.();
  }
}
