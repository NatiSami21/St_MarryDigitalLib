// lib/session.ts
import * as SecureStore from "expo-secure-store";

const SESSION_KEY = "churchlib_current_librarian";

export async function persistSession(librarianId: number) {
  try {
    await SecureStore.setItemAsync(SESSION_KEY, String(librarianId));
  } catch (err) {
    console.warn("persistSession error:", err);
  }
}

export async function clearSession() {
  try {
    await SecureStore.deleteItemAsync(SESSION_KEY);
  } catch (err) {
    console.warn("clearSession error:", err);
  }
}

export async function getSession(): Promise<number | null> {
  try {
    const v = await SecureStore.getItemAsync(SESSION_KEY);
    if (!v) return null;
    const n = Number(v);
    return Number.isNaN(n) ? null : n;
  } catch (err) {
    console.warn("getSession error:", err);
    return null;
  }
}
