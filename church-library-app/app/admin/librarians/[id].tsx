// app/admin/librarians/[id].tsx
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
  ScrollView,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";

import {
  getLibrarianById,
  Librarian,
  updateLibrarianPin,
  unbindLibrarianDevice,
  softDeleteLibrarian,
} from "../../../db/queries/librarians";

import { generateSalt, hashPin } from "../../../lib/authUtils";

export default function LibrarianDetailsScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [librarian, setLibrarian] = useState<Librarian | null>(null);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function load() {
    setLoading(true);
    try {
      if (!id) {
        Alert.alert("Error", "Missing librarian id.");
        router.replace("/admin/librarians");
        return;
      }

      const row = await getLibrarianById(Number(id));
      if (!row) {
        Alert.alert("Not found", "Librarian not found.");
        router.replace("/admin/librarians");
        return;
      }
      setLibrarian(row);
    } catch (err) {
      console.log("Load librarian error:", err);
      Alert.alert("Error", "Failed to load librarian.");
    } finally {
      setLoading(false);
    }
  }

  // Reset PIN handler
  const handleResetPin = async () => {
    if (!librarian) return;
    Alert.alert(
      "Reset PIN",
      `Reset PIN for ${librarian.full_name}? A new temporary 4-digit PIN will be generated.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Reset PIN",
          style: "destructive",
          onPress: async () => {
            try {
              setProcessing(true);

              // Generate secure 4-digit temp PIN
              const tempPin = Math.floor(1000 + Math.random() * 9000).toString();

              const salt = generateSalt();
              const pinHash = await hashPin(tempPin, salt);

              await updateLibrarianPin(librarian.id, salt, pinHash);

              // show PIN once
              Alert.alert(
                "PIN Reset",
                `Temporary PIN for ${librarian.full_name}: ${tempPin}\n\nShare securely with the person. They must change it on first login.`,
                [{ text: "OK", onPress: load }]
              );
            } catch (err) {
              console.log("Reset PIN error:", err);
              Alert.alert("Error", "Failed to reset PIN.");
            } finally {
              setProcessing(false);
            }
          },
        },
      ]
    );
  };

  // Unbind device
  const handleUnbindDevice = async () => {
    if (!librarian) return;
    if (!librarian.device_id) {
      Alert.alert("Info", "This librarian is not bound to a device.");
      return;
    }

    Alert.alert(
      "Unbind Device",
      `Unbind device (${librarian.device_id}) from ${librarian.full_name}? This will allow them to activate a new device.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Unbind",
          style: "destructive",
          onPress: async () => {
            try {
              setProcessing(true);
              await unbindLibrarianDevice(librarian.id);
              Alert.alert("Success", "Device unbound.");
              await load();
            } catch (err) {
              console.log("Unbind error:", err);
              Alert.alert("Error", "Failed to unbind device.");
            } finally {
              setProcessing(false);
            }
          },
        },
      ]
    );
  };

  // Soft-delete librarian
  const handleSoftDelete = async () => {
    if (!librarian) return;

    Alert.alert(
      "Delete Librarian",
      `Are you sure you want to remove ${librarian.full_name}? This is a soft delete and can be synced/reverted by admin tools if needed.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              setProcessing(true);
              await softDeleteLibrarian(librarian.id);
              Alert.alert("Deleted", "Librarian has been removed.", [
                { text: "OK", onPress: () => router.replace("/admin/librarians") },
              ]);
            } catch (err) {
              console.log("Delete error:", err);
              Alert.alert("Error", "Failed to delete librarian.");
            } finally {
              setProcessing(false);
            }
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

  if (!librarian) {
    return null;
  }

  return (
    <ScrollView style={{ flex: 1, padding: 20, backgroundColor: "#f8fafc" }}>
      {/* Header */}
      <View style={{ marginBottom: 18 }}>
        <Text style={{ fontSize: 26, fontWeight: "900", color: "#0b3b86" }}>
          Librarian Profile
        </Text>
        <Text style={{ color: "#6b7280", marginTop: 4 }}>
          Manage account and device binding
        </Text>
      </View>

      {/* Profile Card */}
      <View
        style={{
          backgroundColor: "white",
          padding: 16,
          borderRadius: 14,
          marginBottom: 18,
          elevation: 3,
        }}
      >
        <Text style={{ fontSize: 20, fontWeight: "800", color: "#0f172a" }}>
          {librarian.full_name}
        </Text>
        <Text style={{ color: "#475569", marginTop: 6 }}>Username: {librarian.username}</Text>
        <Text style={{ color: "#475569", marginTop: 4 }}>Role: {librarian.role}</Text>
        <Text
          style={{
            color: librarian.device_id ? "#16a34a" : "#dc2626",
            marginTop: 8,
            fontWeight: "700",
          }}
        >
          Device: {librarian.device_id ? `Bound (${librarian.device_id})` : "Not Bound"}
        </Text>
        <Text style={{ color: "#94a3b8", marginTop: 8 }}>
          {librarian.deleted ? "Status: Deleted" : "Status: Active"}
        </Text>
      </View>

      {/* Management Actions Card (Option C) */}
      <View
        style={{
          backgroundColor: "white",
          padding: 14,
          borderRadius: 14,
          elevation: 3,
          marginBottom: 30,
        }}
      >
        <Text style={{ fontSize: 16, fontWeight: "800", color: "#0b3b86", marginBottom: 8 }}>
          Management Actions
        </Text>

        {/* Reset PIN */}
        <TouchableOpacity
          onPress={handleResetPin}
          disabled={processing}
          style={{
            backgroundColor: "#1e40af",
            padding: 12,
            borderRadius: 10,
            marginBottom: 10,
            opacity: processing ? 0.6 : 1,
          }}
        >
          <Text style={{ color: "white", textAlign: "center", fontWeight: "800" }}>
            Reset PIN
          </Text>
        </TouchableOpacity>

        {/* Unbind Device */}
        <TouchableOpacity
          onPress={handleUnbindDevice}
          disabled={processing || !librarian.device_id}
          style={{
            backgroundColor: "#f59e0b",
            padding: 12,
            borderRadius: 10,
            marginBottom: 10,
            opacity: processing ? 0.6 : 1,
          }}
        >
          <Text style={{ color: "white", textAlign: "center", fontWeight: "800" }}>
            Unbind Device
          </Text>
        </TouchableOpacity>

        {/* Delete */}
        <TouchableOpacity
          onPress={handleSoftDelete}
          disabled={processing}
          style={{
            backgroundColor: "#dc2626",
            padding: 12,
            borderRadius: 10,
            marginBottom: 4,
            opacity: processing ? 0.6 : 1,
          }}
        >
          <Text style={{ color: "white", textAlign: "center", fontWeight: "800" }}>
            Delete Librarian
          </Text>
        </TouchableOpacity>
      </View>

      {/* Back button */}
      <TouchableOpacity
        onPress={() => router.back()}
        style={{
          padding: 12,
          borderRadius: 10,
          alignItems: "center",
          backgroundColor: "#e6eefc",
        }}
      >
        <Text style={{ color: "#0b3b86", fontWeight: "700" }}>Back to list</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}
