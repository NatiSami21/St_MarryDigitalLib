// app/auth/bootstrap.tsx
import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";

export default function BootstrapScreen() {
  const router = useRouter();

  return (
    <View style={{ flex: 1, padding: 24, justifyContent: "center", backgroundColor: "#f8fafc" }}>
      <View style={{ backgroundColor: "white", padding: 22, borderRadius: 14, elevation: 3 }}>
        <Text style={{ fontSize: 28, fontWeight: "800", color: "#1e3a8a", marginBottom: 12 }}>
          Initial Setup Required
        </Text>

        <Text style={{ color: "#475569", marginBottom: 20 }}>
          This device needs to connect to the central server to activate and download the library
          data. Please ensure you have an internet connection and credentials provided by your admin.
        </Text>

        <TouchableOpacity
          onPress={() => router.push("/auth/login-cloud")}
          style={{
            backgroundColor: "#1e40af",
            paddingVertical: 14,
            borderRadius: 10,
            alignItems: "center",
          }}
        >
          <Text style={{ color: "white", fontWeight: "700", fontSize: 16 }}>
            Begin Setup (Online Required)
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
