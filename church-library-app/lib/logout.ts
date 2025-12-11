// lib/logout.ts
import { clearSession } from "./session";
import { router } from "expo-router";
import { syncAll } from "./syncEngine";
import { Alert } from "react-native";

export async function logout() {
  // Try syncing before logout
  try {
    const result = await syncAll();

    if (!result.success) {
      const proceed = await new Promise<boolean>((resolve) => {
        Alert.alert(
          "Sync Failed",
          "Unable to sync pending changes. Logout anyway?",
          [
            { text: "Cancel", style: "cancel", onPress: () => resolve(false) },
            { text: "Logout", style: "destructive", onPress: () => resolve(true) },
          ]
        );
      });

      if (!proceed) return;
    }
  } catch (err) {
    console.log("Logout sync error:", err);
  }

  await clearSession();
  router.replace("/auth/login");
}
