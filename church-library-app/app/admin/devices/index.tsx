// app/admin/devices/index.tsx

import React, { useEffect, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from "react-native";
import { useRouter } from "expo-router";

import { getAllDevices, unbindDevice, getLastSyncForDevice } from "../../../db/queries/devices";

export default function DeviceManagement() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [devices, setDevices] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const list = await getAllDevices();

      // Fetch last sync timestamps for each device
      const enriched = [];
      for (const d of list) {
        const lastSync = await getLastSyncForDevice(d.device_id);
        enriched.push({ ...d, lastSync });
      }

      setDevices(enriched);
    } catch (err) {
      console.log("❌ DeviceManagement load error:", err);
    } finally {
      setLoading(false);
    }
  };

  const refresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const handleUnbind = (id: number, username: string) => {
    Alert.alert(
      "Unbind Device?",
      `This will remove the device binding for librarian '${username}'. They will need to reactivate.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Unbind",
          style: "destructive",
          onPress: async () => {
            const ok = await unbindDevice(id);
            if (ok) {
              Alert.alert("Device Unbound", "Device has been successfully unbound.");
              refresh();
            } else {
              Alert.alert("Error", "Could not unbind device. Try again.");
            }
          },
        },
      ]
    );
  };

  useEffect(() => {
    load();
  }, []);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#1e3a8a" />
      </View>
    );
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: "#f1f5f9", padding: 16 }}>

      {/* Header */}
      <View style={{ flexDirection: "row", marginBottom: 16, alignItems: "center" }}>
        <Text style={{ fontSize: 26, fontWeight: "900", color: "#0f172a", flex: 1 }}>
          Device Management
        </Text>

        <TouchableOpacity
          onPress={refresh}
          style={{
            backgroundColor: "#1e3a8a",
            paddingVertical: 8,
            paddingHorizontal: 14,
            borderRadius: 8,
          }}
        >
          <Text style={{ color: "white", fontWeight: "700" }}>
            {refreshing ? "..." : "Refresh"}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Empty state */}
      {devices.length === 0 && (
        <View
          style={{
            padding: 18,
            backgroundColor: "white",
            borderRadius: 12,
            elevation: 2,
            alignItems: "center",
            marginTop: 20,
          }}
        >
          <Text style={{ fontSize: 18, fontWeight: "700", color: "#475569" }}>
            No devices are currently bound.
          </Text>
          <Text style={{ color: "#6b7280", marginTop: 6 }}>
            Devices will appear here after librarians activate the app.
          </Text>
        </View>
      )}

      {/* Device list */}
      {devices.map((d) => (
        <View
          key={d.device_id}
          style={{
            backgroundColor: "white",
            padding: 16,
            borderRadius: 12,
            elevation: 3,
            marginBottom: 14,
          }}
        >
          <Text style={{ fontSize: 18, fontWeight: "800", color: "#0f172a" }}>
            {d.full_name}
          </Text>
          <Text style={{ marginTop: 4, color: "#475569" }}>Username: {d.username}</Text>
          <Text style={{ color: "#475569" }}>Role: {d.role}</Text>

          <Text style={{ marginTop: 6, color: "#0f172a", fontWeight: "700" }}>
            Device ID:
          </Text>
          <Text style={{ color: "#334155" }}>{d.device_id}</Text>

          <Text style={{ marginTop: 6, color: "#0f172a", fontWeight: "700" }}>
            Last Sync:
          </Text>
          <Text style={{ color: "#334155" }}>
            {d.lastSync ? d.lastSync : "Never Synced"}
          </Text>

          {/* Actions */}
          <View style={{ flexDirection: "row", marginTop: 16 }}>
            <TouchableOpacity
              onPress={() => handleUnbind(d.id, d.username)}
              style={{
                backgroundColor: "#dc2626",
                paddingVertical: 10,
                paddingHorizontal: 14,
                borderRadius: 8,
                marginRight: 10,
                flex: 1,
              }}
            >
              <Text
                style={{ color: "white", textAlign: "center", fontWeight: "800" }}
              >
                Unbind Device
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      ))}

    </ScrollView>
  );
}
