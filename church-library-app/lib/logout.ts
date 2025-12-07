// lib/logout.ts
import { clearSession } from "./session";
import { router } from "expo-router";

export async function logout() {
  await clearSession();
  router.replace("/auth/login");
}
