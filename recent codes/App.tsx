// App.tsx
import { useEffect, useState } from 'react';
import { View, Text } from 'react-native';
import { initDb } from './db/sqlite';

export default function App() {
  const [dbInitialized, setDbInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const initializeDatabase = async () => {
      try {
        console.log("🔄 Initializing database...");
        await initDb();
        setDbInitialized(true);
        console.log("✅ Database initialized successfully");
      } catch (err) {
        console.error("❌ Database initialization failed:", err);
        setError(err instanceof Error ? err.message : 'Unknown error');
      }
    };

    initializeDatabase();
  }, []);

  // Show loading or error state
  if (error) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
        <Text style={{ fontSize: 18, color: 'red', textAlign: 'center' }}>
          Database Error: {error}
        </Text>
      </View>
    );
  }

  if (!dbInitialized) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ fontSize: 18 }}>Initializing database...</Text>
      </View>
    );
  }

  // This will be replaced by Expo Router
  return null;
}