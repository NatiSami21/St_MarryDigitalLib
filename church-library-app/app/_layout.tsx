import { Stack } from "expo-router";
import { useEffect } from "react";
import { initDb } from "../db/sqlite";
//import { runMigrations } from "../db/migrations";

export default function Layout() {
  useEffect(() => {
    initDb();
    //runMigrations();  // ← enable once
  }, []);

  return <Stack screenOptions={{ headerShown: false }} />;
}
