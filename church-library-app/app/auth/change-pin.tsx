// app/auth/change-pin.tsx
import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, Alert, ActivityIndicator } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { runAsync } from "../../db/sqlite";
import { generateSalt, hashPin } from "../../lib/authUtils";

export default function ChangePinScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const usernameParam = (params.username as string) || "";

  const [oldPin, setOldPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);

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
      // For activation flow the server already validated the temp PIN.
      // We will simply create new salt/hash and store locally for usernameParam.
      const salt = generateSalt();
      const hash = await hashPin(newPin, salt);

      await runAsync(
        `UPDATE librarians SET pin_salt = ?, pin_hash = ?, updated_at = ? WHERE username = ?`,
        [salt, hash, new Date().toISOString(), usernameParam]
      );

      Alert.alert("Success", "PIN changed successfully.", [{ text: "OK", onPress: () => router.replace("/") }]);
    } catch (err: any) {
      console.error("change-pin error:", err);
      Alert.alert("Error", "Failed to set new PIN.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ flex: 1, padding: 20, justifyContent: "center", backgroundColor: "#f8fafc" }}>
      <View style={{ backgroundColor: "white", padding: 18, borderRadius: 12 }}>
        <Text style={{ fontSize: 20, fontWeight: "800", color: "#1e3a8a", marginBottom: 8 }}>Set a New PIN</Text>
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

        <TouchableOpacity onPress={handleChange} style={{ backgroundColor: "#1e40af", padding: 12, borderRadius: 8, alignItems: "center" }}>
          {loading ? <ActivityIndicator color="white" /> : <Text style={{ color: "white", fontWeight: "700" }}>Set New PIN</Text>}
        </TouchableOpacity>
      </View>
    </View>
  );
}
