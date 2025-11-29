// app/index.tsx
import React, { useEffect, useState } from "react";
import { View, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";

import { getSession, clearSession } from "../lib/session";
import { getLibrarianByUsername } from "../db/queries/librarians";
import { getMetaValue } from "../db/queries/meta";

export default function Index() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const bootstrap = async () => {
      const session = await getSession();

      // No session → go to login
      if (!session) {
        router.replace("./auth/login");
        return;
      }

      const user = await getLibrarianByUsername(session.username);

      // Local DB invalid → clear and login
      if (!user || user.deleted === 1) {
        await clearSession();
        router.replace("./auth/login");
        return;
      }

      // Device binding check
      const deviceId = await getMetaValue("device_id");
      if (user.device_id && user.device_id !== deviceId) {
        await clearSession();
        router.replace("./auth/login");
        return;
      }

      // Session expiry check (default 12h)
      const age = Date.now() - (session.loggedInAt ?? 0);
      const expiry = 12 * 60 * 60 * 1000;

      if (age > expiry) {
        await clearSession();
        router.replace("./auth/login");
        return;
      }

      // Navigate based on role
      if (user.role === "admin") {
        router.replace("./admin");
      } else {
        router.replace("./home");
      }
    };

    bootstrap().finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <View style={{flex: 1, justifyContent: "center", alignItems: "center"}}>
        <ActivityIndicator size="large" color="#1e3a8a" />
      </View>
    );
  }

  return null;
}
