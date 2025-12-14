// lib/session.ts
import * as SecureStore from "expo-secure-store";
import { db } from "../db/sqlite";


export type SessionPayload = {
  username: string;
  role: "admin" | "librarian";
  loggedInAt: number; // 
  device_id: string; 
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

export async function getCurrentAdminSession() {
  const row = await db.getFirstAsync<{
    username: string;
    device_id: string;
    role: string;
  }>(
    `SELECT username, device_id, role
     FROM librarians
     WHERE device_id IS NOT NULL AND deleted = 0
     LIMIT 1`
  );

  if (!row || row.role !== "admin") {
    throw new Error("No active admin session");
  }

  return row;
}
