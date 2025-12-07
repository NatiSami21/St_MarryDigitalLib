// app/auth/login-cloud.tsx
import { saveSession } from "../../lib/session";
import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { applySnapshot } from "../../lib/activation";
import { postActivate } from "../../lib/network";
import * as Device from "expo-device";

export default function LoginCloud() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);

  const handleActivate = async () => {
    if (!username.trim() || !pin.trim()) {
      Alert.alert("Validation", "Please enter username and PIN.");
      return;
    }

    setLoading(true);
    try {
      // device id - stable per device
      const device_id = Device.osInternalBuildId ?? Device.deviceName ?? "device-" + Date.now();

      const resp = await postActivate({ username: username.trim(), pin: pin.trim(), device_id });

      if (!resp.ok) {
        // handle reasons
        const reason = resp.reason || "Activation failed";
        Alert.alert("Activation Failed", reason);
        setLoading(false);
        return;
      }

      // resp.snapshot, resp.role, resp.require_pin_change, resp.last_pulled_commit
      const { snapshot, role, require_pin_change, last_pulled_commit } = resp;

      // Apply snapshot to local DB
      await applySnapshot({
        snapshot,
        device_id,
        activatedBy: username,
        lastPulledCommit: last_pulled_commit ?? null,
      });

      // If server requires PIN change, route to change-pin screen and pass username
      if (require_pin_change) {
        router.replace({ pathname: "/auth/change-pin", params: { username, next: role === "admin" ? "/admin" : "/" } });
        return;
      }

      await saveSession({
        username,
        role,
        loggedInAt: Date.now(),
        device_id
      });

      // otherwise, create a local session and route to appropriate dashboard
      router.replace(role === "admin" ? "/admin" : "/");
    } catch (err: any) {
      console.log("Activation error:", err);
      Alert.alert("Error", err.message || "Activation failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1, padding: 20, backgroundColor:"#f8fafc", justifyContent: "center" }}>
      <View style={{ backgroundColor: "white", padding: 20, borderRadius: 12, elevation: 3 }}>
        <Text style={{ fontSize: 22, fontWeight: "800", color: "#1e3a8a", marginBottom: 10 }}>
          Activate Device
        </Text>

        <Text style={{ color: "#475569", marginBottom: 16 }}>
          Enter the username and temporary PIN provided by admin.
        </Text>

        <TextInput
          placeholder="Username"
          value={username}
          onChangeText={setUsername}
          autoCapitalize="none"
          style={{ borderWidth: 1, borderColor: "#e6eef9", padding: 12, borderRadius: 8, marginBottom: 12 }}
        />
        <TextInput
          placeholder="4-digit PIN"
          value={pin}
          onChangeText={setPin}
          secureTextEntry
          keyboardType="numeric"
          maxLength={6}
          style={{ borderWidth: 1, borderColor: "#e6eef9", padding: 12, borderRadius: 8, marginBottom: 18 }}
        />

        <TouchableOpacity
          onPress={handleActivate}
          style={{ backgroundColor: "#1e40af", padding: 12, borderRadius: 10, alignItems: "center" }}
          disabled={loading}
        >
          {loading ? <ActivityIndicator color="white" /> : <Text style={{ color: "white", fontWeight: "700" }}>Activate Device</Text>}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}
