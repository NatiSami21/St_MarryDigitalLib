// app/home/index.tsx
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";

import { getDashboardStats, DashboardStats } from "../../db/dashboard";
import { getSession, clearSession } from "../../lib/session";
import { getLibrarianByUsername } from "../../db/queries/librarians";
import { events } from "../../utils/events";

import { syncAll, getSyncStatus } from "../../lib/syncEngine";
 

export default function HomeDashboard() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  // SYNC STATUS
  const [syncStatus, setSyncStatus] = useState({
    pending: 0,
    lastPush: null as string | null,
    lastPull: null as string | null,
  });
  const [syncLoading, setSyncLoading] = useState(false);

  const loadSyncStatus = async () => {
    const s = await getSyncStatus();
    setSyncStatus(s);
  };

  const load = async () => {
    setLoading(true);
    try {
      const s = await getDashboardStats();
      setStats(s);

      const session = await getSession();
      if (session) {
        const user = await getLibrarianByUsername(session.username);
        setIsAdmin(user?.role === "admin");
      }

      await loadSyncStatus();
    } catch (err) {
      console.log("Dashboard load error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    const sub = events.listen("refresh-dashboard", () => {
      load();
    });
    return () => sub.remove();
  }, []);

  // SYNC BUTTON HANDLER
  const handleSync = async () => {
    setSyncLoading(true);
    try {
      const result = await syncAll();

      if (result.success) {
        Alert.alert("Synced", "Cloud sync completed successfully.");
      } else {
        Alert.alert("Sync Failed", "Check internet and try again.");
      }
    } catch (err) {
      Alert.alert("Error", "Sync error occurred.");
    } finally {
      setSyncLoading(false);
      loadSyncStatus();
    }
  };

  // SYNC STATUS DOT
  const getStatusColor = () => {
    if (syncLoading) return "#facc15"; // yellow while syncing
    if (syncStatus.pending > 0) return "#dc2626"; // red
    return "#16a34a"; // green
  };

  if (loading || !stats) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#1e3a8a" />
      </View>
    );
  }

  const Card = ({ title, value, subtitle, color }: any) => (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{title}</Text>
      <Text style={[styles.cardValue, { color: color ?? "#1e3a8a" }]}>{value}</Text>
      {subtitle ? <Text style={styles.cardSubtitle}>{subtitle}</Text> : null}
    </View>
  );

  return (
    <>
      <ScrollView style={{ flex: 1, padding: 18, backgroundColor: "#f8fafc" }}>
        {/* HEADER */}
        <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 12 }}>
          <Text style={styles.headerText}>Library Dashboard</Text>

          {/* SYNC STATUS DOT */}
          <View
            style={{
              width: 14,
              height: 14,
              borderRadius: 7,
              backgroundColor: getStatusColor(),
              marginLeft: 10,
            }}
          />
        </View>

        {/* Admin Panel */}
        {isAdmin && (
          <TouchableOpacity
            onPress={() => router.push("/admin")}
            style={styles.adminButton}
          >
            <Text style={styles.adminButtonText}>Administration</Text>
          </TouchableOpacity>
        )}

        {/* Stat Cards */}
        <View style={{ flexDirection: "row", marginBottom: 12 }}>
          <Card title="Total Books" value={stats.totalBooks} />
          <Card title="Total Users" value={stats.totalUsers} color="#0ea5a4" />
        </View>

        <View style={{ flexDirection: "row", marginBottom: 12 }}>
          <Card title="Active Borrows" value={stats.activeBorrows} color="#dc2626" />
          <Card title="Available Copies" value={stats.availableCopies} color="#16a34a" />
        </View>

        {/* Borrowing Overview */}
        <View style={styles.overviewBox}>
          <Text style={styles.overviewTitle}>Borrowing Overview</Text>
          <Text>Returned Today: {stats.returnedToday}</Text>
          <Text>Returned This Month: {stats.returnedThisMonth}</Text>
          <Text style={{ marginTop: 8, fontWeight: "700", color: "#b91c1c" }}>
            Overdue (14+ days): {stats.overdueCount}
          </Text>
        </View>

        {/* Placeholder chart */}
        <View style={styles.placeholderBox}>
          <Text style={styles.placeholderTitle}>Activity (Placeholder)</Text>
          <Text style={{ color: "#6b7280" }}>Charts will be added in Phase 2.</Text>
        </View>

        {/* Quick Actions */}
        <Text style={styles.quickActionsTitle}>Quick Actions</Text>

        <View style={styles.actionsContainer}>
          {[
            { label: "Borrow", path: "/borrow", color: "#1e3a8a" },
            { label: "Return", path: "/return", color: "#065f46" },
            { label: "Books", path: "/books/list", color: "#0ea5a4" },
            { label: "Users", path: "/users/list", color: "#2563eb" },
            { label: "Transactions", path: "/transactions", color: "#374151" },
            { label: "Print Report", path: "/reports", color: "#6e621cff" },
            { label: "Inventory", path: "/books/inventory", color: "#401c6eff" },
            { label: "Shifts", path: "/librarian/shifts", color: "#7c3aed" },
            { lable: "Attendance", path: "/librarian/shifts/history", color: "#d97706" },
          ].map((btn, i) => (
            <TouchableOpacity
              key={i}
              style={[styles.actionButton, { backgroundColor: btn.color }]}
              onPress={() => router.push(btn.path as any)}
            >
              <Text style={styles.actionButtonText}>{btn.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Logout Button */}
        <View style={styles.logoutContainer}>
          <View style={styles.logoutCard}>
            <Text style={styles.logoutTitle}>Logout</Text>
            <Text style={styles.logoutSubtitle}>Log out of admin session</Text>
            <TouchableOpacity
              style={styles.logoutButton}
              onPress={async () => {
                Alert.alert(
                  "Logout",
                  "Are you sure you want to logout?",
                  [
                    { text: "Cancel", style: "cancel" },
                    {
                      text: "Logout",
                      style: "destructive",
                      onPress: async () => {
                        await clearSession();
                        router.replace("/auth/login");
                      },
                    },
                  ]
                );
              }}
            >
              <Text style={styles.logoutButtonText}>Logout</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
      
      {/* FLOATING SYNC BUTTON */}
      <TouchableOpacity
        style={styles.fab}
        onPress={handleSync}
        disabled={syncLoading}
      >
        {syncLoading ? (
          <ActivityIndicator color="white" />
        ) : (
          <Text style={styles.fabText}>🔄</Text>
        )}
      </TouchableOpacity>
    </>
  );
}

const styles = StyleSheet.create({
  headerText: {
    fontSize: 30,
    fontWeight: "900",
    color: "#0b3b86",
  },
  card: {
    flex: 1,
    backgroundColor: "white",
    padding: 16,
    borderRadius: 12,
    margin: 6,
    elevation: 3,
  },
  cardTitle: { fontSize: 14, fontWeight: "700", color: "#374151" },
  cardValue: { fontSize: 28, fontWeight: "900", marginTop: 8 },
  cardSubtitle: { fontSize: 12, color: "#6b7280", marginTop: 6 },
  adminButton: {
    backgroundColor: "#1e3a8a",
    padding: 14,
    borderRadius: 10,
    marginBottom: 20,
  },
  adminButtonText: {
    color: "white",
    fontSize: 16,
    textAlign: "center",
    fontWeight: "800",
  },
  overviewBox: {
    backgroundColor: "white",
    padding: 14,
    borderRadius: 12,
    marginBottom: 12,
    elevation: 3,
  },
  overviewTitle: { fontWeight: "800", fontSize: 16, marginBottom: 10 },
  placeholderBox: {
    backgroundColor: "white",
    padding: 14,
    borderRadius: 12,
    marginBottom: 14,
    elevation: 3,
  },
  placeholderTitle: { fontWeight: "800", fontSize: 16, marginBottom: 8 },
  quickActionsTitle: { fontWeight: "800", fontSize: 16, marginBottom: 8 },
  actionsContainer: { flexDirection: "row", flexWrap: "wrap", marginBottom: 40 },
  actionButton: {
    minWidth: "48%",
    margin: "1%",
    padding: 14,
    borderRadius: 10,
  },
  actionButtonText: {
    color: "white",
    textAlign: "center",
    fontWeight: "800",
  },
  // Logout styles
  logoutContainer: {
    marginBottom: 40,
  },
  logoutCard: {
    backgroundColor: "white",
    padding: 18,
    borderRadius: 12,
    elevation: 3,
    borderLeftWidth: 4,
    borderLeftColor: "#b91c1c",
  },
  logoutTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#b91c1c",
    marginBottom: 4,
  },
  logoutSubtitle: {
    fontSize: 14,
    color: "#6b7280",
    marginBottom: 16,
  },
  logoutButton: {
    backgroundColor: "#b91c1c",
    padding: 14,
    borderRadius: 10,
    alignItems: "center",
  },
  logoutButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "800",
  },
  fab: {
    position: "absolute",
    bottom: 30,
    right: 25,
    backgroundColor: "#1e3a8a",
    padding: 20,
    borderRadius: 40,
    elevation: 6,
  },
  fabText: {
    color: "white",
    fontSize: 22,
  },
});