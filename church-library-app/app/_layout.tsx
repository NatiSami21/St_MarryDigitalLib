import { Stack } from 'expo-router';
import { useEffect } from 'react';
import { initDb } from '../db/sqlite';

//import { migrateDatabase } from '../db/database';

export default function Layout() {
  useEffect(() => {
    initDb();
    //migrateDatabase();
  }, []);

  return <Stack screenOptions={{ headerShown: false }} />;
}
