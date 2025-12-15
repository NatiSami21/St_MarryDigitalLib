// church-library-app/lib/shiftSession.ts

import { Alert } from "react-native";
import { clearSession } from "./session";

let logoutTimer: ReturnType<typeof setTimeout> | null = null;

/**
 * Schedule automatic logout when shift ends.
 */
export function scheduleShiftLogout(
  shiftEndTime: number,
  onLogout?: () => void
) {
  clearShiftLogout();

  const now = Date.now();
  const delay = shiftEndTime - now;

  if (delay <= 0) {
    forceLogout("Your shift has ended.");
    onLogout?.();
    return;
  }

  logoutTimer = setTimeout(() => {
    forceLogout("Your shift has ended. You have been logged out.");
    onLogout?.();
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

async function forceLogout(message: string) {
  console.log("🚪 Forced logout:", message);
  await clearSession();

  Alert.alert("Session Ended", message, [{ text: "OK" }]);
}
