// app/_layout.tsx
import { Stack, useRouter } from "expo-router";
import { useEffect, useState, useRef } from "react";
import { AppState, AppStateStatus, Alert, Platform } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { initDb } from "../db/sqlite";
import { runMigrations } from "../db/migrations";

import { getSession, clearSession } from "../lib/session";
import { getShiftEndTime, isInsideShift } from "../utils/shift";
import { scheduleShiftLogout, clearShiftLogout } from "../lib/shiftSession";

import * as NavigationBar from "expo-navigation-bar";

export default function Layout() {
  const [ready, setReady] = useState(false);
  const router = useRouter();
  const appState = useRef<AppStateStatus>(AppState.currentState);

  /**
   * Android immersive mode (safe lifecycle)
   */
  useEffect(() => {
    if (Platform.OS === "android") {
      NavigationBar.setVisibilityAsync("hidden");
      NavigationBar.setBehaviorAsync("overlay-swipe");
      NavigationBar.setPositionAsync("absolute");
      NavigationBar.setBackgroundColorAsync("#00000000");
    }
  }, []);

  /**
   * Initialize database
   */
  useEffect(() => {
    const initialize = async () => {
      await initDb();
      // runMigrations(); // enable only when schema changes
      setReady(true);
    };

    initialize();
  }, []);

  /**
   * Guard session on app start & resume
   */
  useEffect(() => {
    if (!ready) return;

    const validateSession = async () => {
      const session = await getSession();
      if (!session) return;

      console.log("🔐 Session detected:", session.username);

      // Admins bypass shift enforcement
      if (session.role === "admin") return;

      const insideShift = await isInsideShift(session.username);
      if (!insideShift) {
        console.warn("⛔ Shift expired while app inactive");

        clearShiftLogout();
        await clearSession();

        Alert.alert(
          "Session Expired",
          "Your shift has ended. Please log in again."
        );

        router.replace("/auth/login");
        return;
      }

      // Schedule auto logout
      const endTs = await getShiftEndTime(session.username);
      if (endTs) {
        scheduleShiftLogout(endTs, () => {
          router.replace("/auth/login");
        });
      }
    };

    validateSession();

    const sub = AppState.addEventListener("change", async (nextState) => {
      if (
        appState.current.match(/inactive|background/) &&
        nextState === "active"
      ) {
        console.log("🔄 App resumed — validating session");
        await validateSession();
      }

      appState.current = nextState;
    });

    return () => {
      sub.remove();
    };
  }, [ready]);

  if (!ready) return null;

  return (
    <SafeAreaProvider>
      <Stack screenOptions={{ headerShown: false }}>
        {/* Explicit startup order */}
        <Stack.Screen name="intro" />
        <Stack.Screen name="index" />
      </Stack>
    </SafeAreaProvider>
  );
}
