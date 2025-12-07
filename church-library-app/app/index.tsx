import React, { useEffect, useState } from "react";
import { View, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";

import { getSession, clearSession } from "../lib/session";
import { getLibrarianByUsername, getLibrarianCount } from "../db/queries/librarians";
import { getMetaValue } from "../db/queries/meta";

export default function Index() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const bootstrap = async () => {
      const session = await getSession();

      // ------------------------------------------
      // FIRST RUN CHECK
      // ------------------------------------------
      if (!session) {
        const count = await getLibrarianCount();

        if (count === 0) {
          // No users → device is fresh → activation required
          router.replace("/auth/bootstrap");
        } else {
          // Users exist → local login allowed
          router.replace("/auth/login");
        }
        return;
      }

      // ------------------------------------------
      // SESSION VALIDATION
      // ------------------------------------------
      const user = await getLibrarianByUsername(session.username);

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

      // SESSION TIMEOUT CHECK (12 hours)
      const age = Date.now() - (session.loggedInAt ?? 0);
      const maxAge = 12 * 60 * 60 * 1000;

      if (age > maxAge) {
        await clearSession();
        router.replace("/auth/login");
        return;
      }

      // ------------------------------------------
      // ROLE ROUTING
      // ------------------------------------------
      router.replace("/home"); // both admin and librarian go here
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
