// app/auth/change-pin.tsx

import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, Alert, ActivityIndicator } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { getMetaValue } from "../../db/queries/meta";
import { postChangePin } from "../../lib/network";


export default function ChangePinScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const usernameParam = (params.username as string) || "";

  const [oldPin, setOldPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const nextRoute = (params.next as string) || "/";


  const handleChange = async () => {
    if (!newPin || newPin.length < 4) {
      Alert.alert("Validation", "New PIN must be at least 4 digits.");
      return;
    }
    if (newPin !== confirm) {
      Alert.alert("Validation", "New PIN and confirm PIN do not match.");
      return;
    }

    setLoading(true);
    try {
      const deviceId = await getMetaValue("device_id");

      const res = await postChangePin({
        username: usernameParam,
        old_pin: oldPin,
        new_pin: newPin,
        device_id: deviceId!,
      });

      if (!res.ok) {
        Alert.alert("Error", res.reason || "PIN change failed");
        return;
      }

      Alert.alert("Success", "PIN changed successfully.", [
        { text: "OK", onPress: () => router.replace(nextRoute as any) }
      ]);
    } catch (err: any) {
      console.error("change-pin error:", err);
      Alert.alert("Error", "Failed to set new PIN.");
    } finally {
      setLoading(false);
    }
  };

  // — UI same as before —
  return (
    <View style={{ flex: 1, padding: 20, justifyContent: "center", backgroundColor: "#f8fafc" }}>
      <View style={{ backgroundColor: "white", padding: 18, borderRadius: 12 }}>
        <Text style={{ fontSize: 20, fontWeight: "800", color: "#1e3a8a", marginBottom: 8 }}>
          Set a New PIN
        </Text>
        <Text style={{ color: "#475569", marginBottom: 12 }}>
          For user <Text style={{ fontWeight: "700" }}>{usernameParam}</Text>. Please set a new 4-digit PIN now.
        </Text>

        <TextInput
          placeholder="Old / temporary PIN"
          value={oldPin}
          onChangeText={setOldPin}
          secureTextEntry
          keyboardType="numeric"
          style={{ borderWidth: 1, borderColor: "#e6eef9", padding: 12, borderRadius: 8, marginBottom: 10 }}
        />

        <TextInput
          placeholder="New PIN"
          value={newPin}
          onChangeText={setNewPin}
          secureTextEntry
          keyboardType="numeric"
          style={{ borderWidth: 1, borderColor: "#e6eef9", padding: 12, borderRadius: 8, marginBottom: 10 }}
        />

        <TextInput
          placeholder="Confirm New PIN"
          value={confirm}
          onChangeText={setConfirm}
          secureTextEntry
          keyboardType="numeric"
          style={{ borderWidth: 1, borderColor: "#e6eef9", padding: 12, borderRadius: 8, marginBottom: 14 }}
        />

        <TouchableOpacity
          onPress={handleChange}
          style={{ backgroundColor: "#1e40af", padding: 12, borderRadius: 8, alignItems: "center" }}
        >
          {loading ? <ActivityIndicator color="white" /> : <Text style={{ color: "white", fontWeight: "700" }}>Set New PIN</Text>}
        </TouchableOpacity>
      </View>
    </View>
  );
}
