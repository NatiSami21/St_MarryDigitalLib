import { Stack } from "expo-router";
import { useEffect } from "react";
import { initDb } from "../db/sqlite";
import { useState } from "react";

import { runMigrations } from "../db/migrations";
 
export default function Layout() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const initialize = async () => {
      await initDb();
      setReady(true);
      runMigrations();  // ← enable once
    };
    initialize();
  }, []);

  if (!ready) return null;

  return <Stack screenOptions={{ headerShown: false }} />;
}