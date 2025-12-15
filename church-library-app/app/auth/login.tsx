// church-library-app/app/auth/login.tsx

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

import { isInsideShift, getShiftEndTime } from "../../utils/shift";
import { scheduleShiftLogout } from "../../lib/shiftSession";

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
      const user = await getLibrarianByUsername(username.trim());

      if (!user) {
        Alert.alert("Not Found", "User not found on this device.");
        return;
      }

      const deviceId = await getMetaValue("device_id");
      if (user.device_id && user.device_id !== deviceId) {
        Alert.alert(
          "Device Mismatch",
          "This account is bound to a different device."
        );
        return;
      }

      const isValid = await verifyPinHash(
        pin.trim(),
        user.pin_salt ?? "",
        user.pin_hash ?? ""
      );

      if (!isValid) {
        Alert.alert("Invalid PIN", "Incorrect PIN.");
        return;
      }

      if (user.require_pin_change) {
        router.replace({
          pathname: "/auth/change-pin",
          params: { username: user.username },
        });
        return;
      }

      // 🔐 SHIFT CHECK — admin bypass
      let shiftEndTime: number | null = null;

      if (user.role === "librarian") {
        const allowed = await isInsideShift(user.username);
        if (!allowed) {
          Alert.alert(
            "Access Denied",
            "❌ You are outside your scheduled shift time."
          );
          return;
        }

        shiftEndTime = await getShiftEndTime(user.username);
      }

      // Save session ONLY after all checks pass
      await saveSession({
        username: user.username,
        role: user.role,
        loggedInAt: Date.now(),
        device_id: deviceId,
      });

      // ⏱ Schedule auto logout
      if (shiftEndTime) {
        scheduleShiftLogout(shiftEndTime, () => {
          router.replace("/auth/login");
        });
      }

      console.log("✅ Login successful:", user.username);
      router.replace("/");
    } catch (e) {
      console.error("❌ Login error:", e);
      Alert.alert("Error", "Login failed.");
    } finally {
      setLoading(false);
    }
  };

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
            <Text
              style={{ color: "white", fontWeight: "700", fontSize: 16 }}
            >
              Login
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}
