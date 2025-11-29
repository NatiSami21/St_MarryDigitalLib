// lib/session.ts
import * as SecureStore from "expo-secure-store";

export type SessionPayload = {
  username: string;
  role: "admin" | "librarian";
  loggedInAt: number; // timestamp
};

export async function saveSession(session: SessionPayload): Promise<void> {
  await SecureStore.setItemAsync("session", JSON.stringify(session));
}

export async function getSession(): Promise<SessionPayload | null> {
  const v = await SecureStore.getItemAsync("session");
  return v ? (JSON.parse(v) as SessionPayload) : null;
}

export async function clearSession(): Promise<void> {
  await SecureStore.deleteItemAsync("session");
}
