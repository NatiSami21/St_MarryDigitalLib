import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";

import { getLibrarianByUsername } from "../../db/queries/librarians";
import { verifyPinHash } from "../../lib/authUtils";
import { saveSession } from "../../lib/session";
import { getMetaValue } from "../../db/queries/meta";

import { getActiveShift } from "../../utils/shift";
import { scheduleShiftLogout } from "../../lib/shiftSession";
import { implicitClockIn } from "../../db/queries/attendance";

export default function LoginScreen() {
  const router = useRouter();

  const [username, setUsername] = useState("");
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!username.trim() || !pin.trim()) {
      Alert.alert("Validation", "Enter username and PIN.");
      return;
    }

    setLoading(true);

    try {
      /* --------------------------------------------------
       * 1. Local user lookup
       * --------------------------------------------------*/
      const user = await getLibrarianByUsername(username.trim());

      if (!user) {
        Alert.alert("Not Found", "User not found on this device.");
        return;
      }

      /* --------------------------------------------------
       * 2. Device binding check
       * --------------------------------------------------*/
      const deviceId = await getMetaValue("device_id");

      if (user.device_id && user.device_id !== deviceId) {
        Alert.alert(
          "Device Mismatch",
          "This account is bound to a different device."
        );
        return;
      }

      /* --------------------------------------------------
       * 3. PIN verification
       * --------------------------------------------------*/
      const validPin = await verifyPinHash(
        pin.trim(),
        user.pin_salt ?? "",
        user.pin_hash ?? ""
      );

      if (!validPin) {
        Alert.alert("Invalid PIN", "Incorrect PIN.");
        return;
      }

      /* --------------------------------------------------
       * 4. Force PIN change if required
       * --------------------------------------------------*/
      if (user.require_pin_change) {
        router.replace({
          pathname: "/auth/change-pin",
          params: { username: user.username },
        });
        return;
      }

      /* --------------------------------------------------
       * 5. Shift validation (LIBRARIAN ONLY)
       * --------------------------------------------------*/
      let activeShift: Awaited<ReturnType<typeof getActiveShift>> | null = null;

      if (user.role === "librarian") {
        activeShift = await getActiveShift(user.username);

        if (!activeShift) {
          Alert.alert(
            "Access Denied",
            "❌ You are outside your scheduled shift time."
          );
          return;
        }
      }

      /* --------------------------------------------------
       * 6. Save session (after ALL checks)
       * --------------------------------------------------*/
      await saveSession({
        username: user.username,
        role: user.role,
        loggedInAt: Date.now(),
        device_id: deviceId,
      });

      /* --------------------------------------------------
       * 7. Implicit Attendance (LIBRARIAN ONLY)
       * --------------------------------------------------*/
      if (user.role === "librarian" && activeShift) {
        await implicitClockIn(
          activeShift.id,
          user.username,
          activeShift.startTs
        );
      }

      /* --------------------------------------------------
       * 8. Schedule auto logout at shift end
       * --------------------------------------------------*/
      if (user.role === "librarian" && activeShift) {
        scheduleShiftLogout(activeShift.endTs, () => {
          router.replace("/auth/login");
        });
      }

      /* --------------------------------------------------
       * 9. Navigate
       * --------------------------------------------------*/
      console.log("✅ Login successful:", user.username);
      router.replace(user.role === "admin" ? "/admin" : "/");

    } catch (err) {
      console.error("❌ Login error:", err);
      Alert.alert("Error", "Login failed.");
    } finally {
      setLoading(false);
    }
  };

  /* --------------------------------------------------
   * UI
   * --------------------------------------------------*/
  return (
    <View
      style={{
        flex: 1,
        padding: 24,
        justifyContent: "center",
        backgroundColor: "#f8fafc",
      }}
    >
      <View
        style={{
          backgroundColor: "white",
          padding: 20,
          borderRadius: 14,
          elevation: 3,
        }}
      >
        <Text
          style={{
            fontSize: 26,
            fontWeight: "800",
            color: "#1e3a8a",
            marginBottom: 10,
          }}
        >
          Login
        </Text>

        <Text style={{ color: "#475569", marginBottom: 16 }}>
          Enter your username and PIN to continue.
        </Text>

        <TextInput
          placeholder="Username"
          value={username}
          onChangeText={setUsername}
          autoCapitalize="none"
          editable={!loading}
          style={{
            borderWidth: 1,
            borderColor: "#dbeafe",
            padding: 12,
            borderRadius: 10,
            marginBottom: 12,
          }}
        />

        <TextInput
          placeholder="4-digit PIN"
          value={pin}
          onChangeText={setPin}
          secureTextEntry
          keyboardType="numeric"
          maxLength={6}
          editable={!loading}
          style={{
            borderWidth: 1,
            borderColor: "#dbeafe",
            padding: 12,
            borderRadius: 10,
            marginBottom: 18,
          }}
        />

        <TouchableOpacity
          onPress={handleLogin}
          disabled={loading}
          style={{
            backgroundColor: "#1e40af",
            paddingVertical: 14,
            borderRadius: 10,
            alignItems: "center",
          }}
        >
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={{ color: "white", fontWeight: "700", fontSize: 16 }}>
              Login
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}
