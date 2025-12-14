// app/admin/librarians/index.tsx
import React, { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, ActivityIndicator, Alert, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { getAllLibrarians, softDeleteLibrarian, unbindLibrarianDevice } from "../../../db/queries/librarians";
import { updateLibrarianPin } from "../../../db/queries/librarians";
import { generateSalt, hashPin } from "../../../lib/authUtils";
import { getCurrentAdminSession } from "../../../lib/session";

export interface Librarian {
  id: number;
  username: string;
  full_name: string;
  role: "admin" | "librarian";
  device_id: string | null;
  pin_salt: string | null;
  pin_hash: string | null;
  deleted: number;
  require_pin_change: boolean;
}


export default function ManageLibrarians() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [librarians, setLibrarians] = useState<Librarian[]>([]);

  const load = async () => {
    try {
      setLoading(true);
      const rows = await getAllLibrarians();
      setLibrarians(rows);
    } catch (e) {
      console.log("Load librarians error:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const onDelete = (lib: Librarian) => {
    // 🚨 SAFETY: prevent deleting last admin
    const adminCount = librarians.filter(l => l.role === "admin").length;

    if (lib.role === "admin" && adminCount === 1) {
      Alert.alert(
        "Not allowed",
        "You must keep at least one admin."
      );
      return;
    }

    Alert.alert(
      "Delete Librarian",
      `Are you sure you want to delete "${lib.full_name}"?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              const API_BASE =
                process.env.EXPO_PUBLIC_API_BASE_URL || "";

              const admin = await getCurrentAdminSession();

              const res = await fetch(
                `${API_BASE}/auth-admin-delete-librarian`,
                {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    admin_username: admin.username,
                    device_id: admin.device_id,
                    target_username: lib.username,
                  }),
                }
              );

              const json = await res.json();

              if (!json.ok) {
                Alert.alert("Delete failed", json.reason);
                return;
              }

              // ✅ mirror server state locally
              await softDeleteLibrarian(lib.id);
              load();

            } catch (e: any) {
              Alert.alert("Error", e.message ?? "Failed to delete librarian");
            }
          },
        },
      ]
    );
  };



  const onUnbind = (lib: any) => {
    if (!lib.device_id) {
      Alert.alert("Already unbound", "This librarian does not have a device bound.");
      return;
    }

    Alert.alert(
      "Unbind Device",
      `Remove device binding for "${lib.full_name}"?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Unbind",
          style: "destructive",
          onPress: async () => {
            await unbindLibrarianDevice(lib.id);
            load();
          },
        },
      ]
    );
  };

  const onResetPin = (lib: any) => {
    Alert.alert(
      "Reset PIN",
      `Reset PIN for "${lib.full_name}"? They must change PIN after login.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Reset",
          style: "destructive",
          onPress: async () => {
            const salt = generateSalt();
            const newPin = Math.floor(1000 + Math.random() * 9000).toString(); // PATCH 1
            const hash = await hashPin(newPin, salt);

            // PATCH 2: Update local DB and set require_pin_change
            await updateLibrarianPin(lib.id, salt, hash, true);

            // PATCH 3: Sync to cloud
            const API_BASE =
              process.env.EXPO_PUBLIC_API_BASE_URL || "";

            await fetch(`${API_BASE}/auth-admin-reset-pin`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                username: lib.username,
                new_pin: newPin
              }),
            });

            Alert.alert(
              "PIN Reset",
              `Temporary PIN for ${lib.full_name} is: ${newPin}\nAsk them to change it on next login.`
            );
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#1e3a8a" />
      </View>
    );
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: "#f1f5f9", padding: 16 }}>

      <Text style={{ fontSize: 28, fontWeight: "900", color: "#1e3a8a", marginBottom: 16 }}>
        Manage Librarians
      </Text>

      <TouchableOpacity
        onPress={() => router.push("/admin/librarians/add")}
        style={{
          backgroundColor: "#1e3a8a",
          padding: 14,
          borderRadius: 10,
          marginBottom: 16,
        }}
      >
        <Text style={{ color: "white", textAlign: "center", fontSize: 16, fontWeight: "800" }}>
          + Add Librarian
        </Text>
      </TouchableOpacity>

      {librarians.length === 0 && (
        <Text style={{ textAlign: "center", marginTop: 40, color: "#64748b" }}>
          No librarians found.
        </Text>
      )}

      {librarians.map((lib) => (
        <View
          key={lib.id}
          style={{
            backgroundColor: "white",
            padding: 16,
            borderRadius: 12,
            marginBottom: 14,
            elevation: 2,
          }}
        >
          <Text style={{ fontSize: 18, fontWeight: "700", color: "#0f172a" }}>
            {lib.full_name}
          </Text>
          <Text style={{ color: "#475569", marginTop: 4 }}>Username: {lib.username}</Text>
          <Text style={{ color: "#475569" }}>Role: {lib.role}</Text>
          <Text style={{ color: lib.device_id ? "#16a34a" : "#dc2626", marginTop: 4 }}>
            Device: {lib.device_id ? "Bound" : "Not Bound"}
          </Text>

          {/* Action buttons */}
          <View style={{ flexDirection: "row", marginTop: 12 }}>
            <TouchableOpacity
              onPress={() => onResetPin(lib)}
              style={{
                backgroundColor: "#0ea5e9",
                padding: 10,
                borderRadius: 8,
                marginRight: 8,
                flex: 1,
              }}
            >
              <Text style={{ color: "white", textAlign: "center", fontWeight: "700" }}>Reset PIN</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => onUnbind(lib)}
              style={{
                backgroundColor: "#6d28d9",
                padding: 10,
                borderRadius: 8,
                marginRight: 8,
                flex: 1,
              }}
            >
              <Text style={{ color: "white", textAlign: "center", fontWeight: "700" }}>
                Unbind Device
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => onDelete(lib)}
              style={{
                backgroundColor: "#dc2626",
                padding: 10,
                borderRadius: 8,
                flex: 1,
              }}
            >
              <Text style={{ color: "white", textAlign: "center", fontWeight: "700" }}>Delete</Text>
            </TouchableOpacity>
          </View>
        </View>
      ))}
    </ScrollView>
  );
}
