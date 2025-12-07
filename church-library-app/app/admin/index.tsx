// app/admin/index.tsx

import React, { useEffect, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";

import { getSession, clearSession } from "../../lib/session";
import { getLibrarianByUsername } from "../../db/queries/librarians";
import { getMetaValue } from "../../db/queries/meta";

export default function AdminDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [adminName, setAdminName] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        const session = await getSession();
        if (!session) {
          router.replace("/auth/login");
          return;
        }

        const user = await getLibrarianByUsername(session.username);
        if (!user || user.role !== "admin") {
          await clearSession();
          router.replace("/auth/login");
          return;
        }

        // Device binding check
        const deviceId = await getMetaValue("device_id");
        if (user.device_id && user.device_id !== deviceId) {
          await clearSession();
          router.replace("/auth/login");
          return;
        }

        setAdminName(user.username);
      } catch (err) {
        console.log("Admin dashboard load error:", err);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  if (loading) {
    return (
      <View style={{flex:1, justifyContent:"center", alignItems:"center"}}>
        <ActivityIndicator size="large" color="#1e3a8a" />
      </View>
    );
  }

  const MenuButton = ({ title, subtitle, onPress, color }: any) => (
    <TouchableOpacity
      onPress={onPress}
      style={{
        backgroundColor: "white",
        padding: 18,
        borderRadius: 14,
        marginBottom: 14,
        elevation: 3,
      }}
    >
      <Text style={{ fontSize: 18, fontWeight: "800", color: color ?? "#1e3a8a" }}>
        {title}
      </Text>

      {subtitle && (
        <Text style={{ fontSize: 13, color: "#6b7280", marginTop: 6 }}>
          {subtitle}
        </Text>
      )}
    </TouchableOpacity>
  );

  return (
    <ScrollView style={{ flex: 1, padding: 20, backgroundColor: "#f8fafc" }}>
      
      {/* HEADER */}
      <Text style={{ fontSize: 32, fontWeight: "900", color: "#0b3b86", marginBottom: 4 }}>
        Admin Panel
      </Text>

      <Text style={{ fontSize: 14, color: "#475569", marginBottom: 24 }}>
        Logged in as <Text style={{ fontWeight: "700" }}>{adminName}</Text>
      </Text>

      {/* SECTION TITLE */}
      <Text style={{ fontSize: 20, fontWeight: "800", color: "#1e3a8a", marginBottom: 14 }}>
        Management
      </Text>

      {/* MENU BUTTONS */}
      <MenuButton
        title="Manage Librarians"
        subtitle="Add, delete, update, reset PIN, assign device"
        onPress={() => router.push("/admin/librarians/list")}
      />

      <MenuButton
        title="Device Management"
        subtitle="View bound devices, unbind, secure device access"
        onPress={() => router.push("/admin/devices")}
      />

      <MenuButton
        title="Sync & Cloud Control"
        subtitle="Push pending commits, pull latest data, troubleshoot sync"
        onPress={() => router.push("/admin/sync")}
      />

      <MenuButton
        title="Commit Logs"
        subtitle="Review all operations, revert unsafe commits, audit library activity"
        onPress={() => router.push("/admin/commits")}
      />

      <MenuButton
        title="Shift Management"
        subtitle="Define shifts, link borrows/returns to shifts, view shift productivity"
        onPress={() => router.push("/admin/shifts")}
      />

      <MenuButton
        title="Analytics"
        subtitle="Borrow frequency, top books, overdue trends, system health"
        onPress={() => router.push("./admin/analytics")}
      />

      {/* DANGER ZONE */}
      <Text style={{ fontSize: 20, fontWeight: "800", color: "#b91c1c", marginTop: 24, marginBottom: 14 }}>
        Danger Zone
      </Text>

      <MenuButton
        title="Logout"
        color="#b91c1c"
        subtitle="Log out of admin session"
        onPress={async () => {
          await clearSession();
          router.replace("/auth/login");
        }}
      />

    </ScrollView>
  );
}

  