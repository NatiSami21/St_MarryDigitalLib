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

      // NO SESSION → go to offline login
      if (!session) {
        router.replace("/auth/login");
        return;
      }

      const user = await getLibrarianByUsername(session.username);

      // USER NO LONGER EXISTS LOCALLY → session invalid
      if (!user || user.deleted === 1) {
        await clearSession();
        router.replace("/auth/login");
        return;
      }

      // DEVICE BINDING CHECK
      const deviceId = await getMetaValue("device_id");
      if (user.device_id && user.device_id !== deviceId) {
        await clearSession();
        router.replace("/auth/login");
        return;
      }

      // SESSION EXPIRES AFTER 12 HOURS
      const age = Date.now() - (session.loggedInAt ?? 0);
      const maxAge = 12 * 60 * 60 * 1000;

      if (age > maxAge) {
        await clearSession();
        router.replace("/auth/login");
        return;
      }

      // ROLE-BASED ROUTING
      if (user.role === "admin") {
        router.replace("/home"); // ADMIN ALSO SEES SAME HOME BUT WITH ADMIN BUTTON
      } else {
        router.replace("/home");
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
