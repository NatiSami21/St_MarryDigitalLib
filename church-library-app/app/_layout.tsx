import { Stack } from 'expo-router';
import { useEffect } from 'react';
import { initDb } from '../db/sqlite';

export default function Layout() {
  useEffect(() => {
    initDb();
  }, []);

  return <Stack screenOptions={{ headerShown: false }} />;
}
