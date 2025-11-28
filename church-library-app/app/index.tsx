// app/index.tsx
import React, { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { getDashboardStats, DashboardStats } from "../db/dashboard";

export default function Dashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const s = await getDashboardStats();
      setStats(s);
    } catch (err) {
      console.log("Dashboard load error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // optional: reload when screen focus in future
  }, []);

  if (loading || !stats) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#1e3a8a" />
      </View>
    );
  }

  const Card = ({ title, value, subtitle, color }: any) => (
    <View
      style={{
        flex: 1,
        backgroundColor: "white",
        padding: 16,
        borderRadius: 12,
        margin: 6,
        elevation: 3,
      }}
    >
      <Text style={{ fontSize: 14, fontWeight: "700", color: "#374151" }}>{title}</Text>
      <Text style={{ fontSize: 28, fontWeight: "900", marginTop: 8, color: color ?? "#1e3a8a" }}>
        {value}
      </Text>
      {subtitle ? <Text style={{ fontSize: 12, color: "#6b7280", marginTop: 6 }}>{subtitle}</Text> : null}
    </View>
  );

  return (
    <ScrollView style={{ flex: 1, padding: 18, backgroundColor: "#f8fafc" }}>
      <Text style={{ fontSize: 30, fontWeight: "900", marginBottom: 12, color: "#0b3b86" }}>
        Library Dashboard
      </Text>

      {/* Top stat cards */}
      <View style={{ flexDirection: "row", marginBottom: 12 }}>
        <Card title="Total Books" value={stats.totalBooks} />
        <Card title="Total Users" value={stats.totalUsers} color="#0ea5a4" />
      </View>

      <View style={{ flexDirection: "row", marginBottom: 12 }}>
        <Card title="Active Borrows" value={stats.activeBorrows} color="#dc2626" />
        <Card title="Available Copies" value={stats.availableCopies} color="#16a34a" />
      </View>

      {/* Borrowing overview */}
      <View style={{ backgroundColor: "white", padding: 14, borderRadius: 12, marginBottom: 12, elevation: 3 }}>
        <Text style={{ fontWeight: "800", fontSize: 16, marginBottom: 10 }}>Borrowing Overview</Text>
        <Text>Returned Today: {stats.returnedToday}</Text>
        <Text>Returned This Month: {stats.returnedThisMonth}</Text>
        <Text style={{ marginTop: 8, fontWeight: "700", color: "#b91c1c" }}>
          Overdue (14+ days): {stats.overdueCount}
        </Text>
      </View>

      {/* Placeholder chart */}
      <View style={{ backgroundColor: "white", padding: 14, borderRadius: 12, marginBottom: 14, elevation: 3 }}>
        <Text style={{ fontWeight: "800", fontSize: 16, marginBottom: 8 }}>Activity (Placeholder)</Text>
        <Text style={{ color: "#6b7280" }}>Charts will be added in Phase 2 — for now this is a placeholder.</Text>
      </View>

      {/* Quick actions */}
      <Text style={{ fontWeight: "800", fontSize: 16, marginBottom: 8 }}>Quick Actions</Text>

      <View style={{ flexDirection: "row", flexWrap: "wrap", marginBottom: 40 }}>
        <TouchableOpacity
          onPress={() => router.push("/borrow")}
          style={{ minWidth: "48%", margin: "1%", backgroundColor: "#1e3a8a", padding: 14, borderRadius: 10 }}
        >
          <Text style={{ color: "white", textAlign: "center", fontWeight: "800" }}>Borrow</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => router.push("/return")}
          style={{ minWidth: "48%", margin: "1%", backgroundColor: "#065f46", padding: 14, borderRadius: 10 }}
        >
          <Text style={{ color: "white", textAlign: "center", fontWeight: "800" }}>Return</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => router.push("/books/list")}
          style={{ minWidth: "48%", margin: "1%", backgroundColor: "#0ea5a4", padding: 14, borderRadius: 10 }}
        >
          <Text style={{ color: "white", textAlign: "center", fontWeight: "800" }}>Books</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => router.push("/users/list")}
          style={{ minWidth: "48%", margin: "1%", backgroundColor: "#2563eb", padding: 14, borderRadius: 10 }}
        >
          <Text style={{ color: "white", textAlign: "center", fontWeight: "800" }}>Users</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => router.push("/transactions")}
          style={{ minWidth: "48%", margin: "1%", backgroundColor: "#374151", padding: 14, borderRadius: 10 }}
        >
          <Text style={{ color: "white", textAlign: "center", fontWeight: "800" }}>Transactions</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}
