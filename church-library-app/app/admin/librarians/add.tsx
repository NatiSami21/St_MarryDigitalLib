import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
} from "react-native";
import { useRouter } from "expo-router";

import { isUsernameTaken, insertLibrarian } from "../../../db/queries/librarians";
import { generateSalt, hashPin } from "../../../lib/authUtils";

export default function AddLibrarianScreen() {
  const router = useRouter();

  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [role, setRole] = useState<"admin" | "librarian">("librarian");

  const [loading, setLoading] = useState(false);

  async function handleCreate() {
    if (!fullName.trim() || !username.trim()) {
      Alert.alert("Missing Fields", "Please fill all fields.");
      return;
    }

    setLoading(true);

    try {
      // Check duplicate username
      const taken = await isUsernameTaken(username.trim());
      if (taken) {
        Alert.alert("Username Exists", "Please choose another username.");
        setLoading(false);
        return;
      }

      // Generate temporary PIN (e.g., 1234 random)
      const temporaryPin = (1000 + Math.floor(Math.random() * 9000)).toString();

      const salt = generateSalt();
      const pin_hash = await hashPin(temporaryPin, salt);

      // Insert into DB
      await insertLibrarian({
        username: username.trim(),
        full_name: fullName.trim(),
        role,
        salt,
        pin_hash,
      });

      Alert.alert(
        "Librarian Created",
        `Username: ${username}\nTemporary PIN: ${temporaryPin}\n\nTell the librarian to change it on first use.`,
        [{ text: "OK", onPress: () => router.back() }]
      );
    } catch (err) {
      console.log("Create librarian error:", err);
      Alert.alert("Error", "Failed to create librarian.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScrollView style={{ flex: 1, padding: 20, backgroundColor: "#f8fafc" }}>
      <Text style={{ fontSize: 28, fontWeight: "900", color: "#0f172a", marginBottom: 20 }}>
        Add Librarian
      </Text>

      {/* Full Name */}
      <Text style={{ fontWeight: "700", marginBottom: 6, color: "#1e293b" }}>Full Name</Text>
      <TextInput
        value={fullName}
        onChangeText={setFullName}
        placeholder="John Doe"
        style={{
          backgroundColor: "white",
          padding: 14,
          borderRadius: 10,
          borderWidth: 1,
          borderColor: "#cbd5e1",
          marginBottom: 16,
        }}
      />

      {/* Username */}
      <Text style={{ fontWeight: "700", marginBottom: 6, color: "#1e293b" }}>Username</Text>
      <TextInput
        value={username}
        onChangeText={setUsername}
        placeholder="johndoe"
        autoCapitalize="none"
        style={{
          backgroundColor: "white",
          padding: 14,
          borderRadius: 10,
          borderWidth: 1,
          borderColor: "#cbd5e1",
          marginBottom: 16,
        }}
      />

      {/* Role Selector */}
      <Text style={{ fontWeight: "700", marginBottom: 6, color: "#1e293b" }}>Role</Text>

      <View style={{ flexDirection: "row", marginBottom: 20 }}>
        <TouchableOpacity
          onPress={() => setRole("librarian")}
          style={{
            flex: 1,
            padding: 14,
            backgroundColor: role === "librarian" ? "#1e3a8a" : "white",
            borderRadius: 10,
            borderWidth: 1,
            borderColor: "#1e3a8a",
            marginRight: 6,
          }}
        >
          <Text
            style={{
              textAlign: "center",
              fontWeight: "700",
              color: role === "librarian" ? "white" : "#1e3a8a",
            }}
          >
            Librarian
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setRole("admin")}
          style={{
            flex: 1,
            padding: 14,
            backgroundColor: role === "admin" ? "#2563eb" : "white",
            borderRadius: 10,
            borderWidth: 1,
            borderColor: "#2563eb",
            marginLeft: 6,
          }}
        >
          <Text
            style={{
              textAlign: "center",
              fontWeight: "700",
              color: role === "admin" ? "white" : "#2563eb",
            }}
          >
            Admin
          </Text>
        </TouchableOpacity>
      </View>

      {/* Submit Button */}
      <TouchableOpacity
        disabled= {loading}
        onPress={handleCreate}
        style={{
          backgroundColor: "#0f172a",
          padding: 16,
          borderRadius: 12,
          alignItems: "center",
          marginTop: 10,
        }}
      >
        {loading ? (
          <ActivityIndicator color="white" />
        ) : (
          <Text style={{ color: "white", fontWeight: "800", fontSize: 16 }}>Create Librarian</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}
