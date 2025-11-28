import { Stack } from "expo-router";
import { useEffect } from "react";
import { initDb } from "../db/sqlite";
//import { migrateDatabase } from "../db/migrate";

export default function Layout() {
  useEffect(() => {
    initDb();
    //migrateDatabase();  // ← enable once
  }, []);

  return <Stack screenOptions={{ headerShown: false }} />;
}
