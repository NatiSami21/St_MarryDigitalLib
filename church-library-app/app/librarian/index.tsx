import React, { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";

import { getDashboardStats, DashboardStats } from "../../db/dashboard";
import { getSession } from "../../lib/session";
import { getLibrarianByUsername } from "../../db/queries/librarians";
import { events } from "../../utils/events";

export default function HomeDashboard() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

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

  if (loading || !stats) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#1e3a8a" />
      </View>
    );
  }

  /* Shared dashboard card */
  const Card = ({ title, value, color }: any) => (
    <View
      style={{
        flex: 1,
        backgroundColor: "white",
        padding: 18,
        borderRadius: 14,
        margin: 6,
        elevation: 4,
        shadowColor: "#000",
        shadowOpacity: 0.08,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 2 },
      }}
    >
      <Text style={{ fontSize: 14, fontWeight: "700", color: "#475569" }}>{title}</Text>
      <Text style={{ fontSize: 32, fontWeight: "900", marginTop: 8, color: color ?? "#1e3a8a" }}>
        {value}
      </Text>
    </View>
  );

  /* Shared quick-action card */
  const ActionCard = ({ label, color, onPress }: any) => (
    <TouchableOpacity
      onPress={onPress}
      style={{
        width: "48%",
        margin: "1%",
        backgroundColor: color,
        paddingVertical: 18,
        borderRadius: 14,
        elevation: 3,
        shadowColor: "#000",
        shadowOpacity: 0.08,
        shadowRadius: 5,
        shadowOffset: { width: 0, height: 2 },
      }}
    >
      <Text style={{ color: "white", textAlign: "center", fontWeight: "800", fontSize: 15 }}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  return (
    <ScrollView style={{ flex: 1, padding: 20, backgroundColor: "#f1f5f9" }}>
      <Text style={{ fontSize: 34, fontWeight: "900", marginBottom: 12, color: "#0b3b86" }}>
        Library Dashboard
      </Text>

      {/* Admin Panel Button */}
      {isAdmin && (
        <TouchableOpacity
          onPress={() => router.push("/admin")}
          style={{
            backgroundColor: "#1e3a8a",
            padding: 15,
            borderRadius: 12,
            marginBottom: 24,
            elevation: 3,
          }}
        >
          <Text style={{ color: "white", fontSize: 16, textAlign: "center", fontWeight: "800" }}>
            Administration
          </Text>
        </TouchableOpacity>
      )}

      {/* Stats */}
      <View style={{ flexDirection: "row", marginBottom: 12 }}>
        <Card title="Total Books" value={stats.totalBooks} />
        <Card title="Total Users" value={stats.totalUsers} color="#0ea5a4" />
      </View>

      <View style={{ flexDirection: "row", marginBottom: 12 }}>
        <Card title="Active Borrows" value={stats.activeBorrows} color="#dc2626" />
        <Card title="Available Copies" value={stats.availableCopies} color="#16a34a" />
      </View>

      {/* Borrowing overview */}
      <View
        style={{
          backgroundColor: "white",
          padding: 16,
          borderRadius: 14,
          marginBottom: 18,
          elevation: 4,
          shadowColor: "#000",
          shadowOpacity: 0.08,
          shadowRadius: 6,
          shadowOffset: { width: 0, height: 2 },
        }}
      >
        <Text style={{ fontWeight: "800", fontSize: 17, marginBottom: 10 }}>Borrowing Overview</Text>
        <Text>Returned Today: {stats.returnedToday}</Text>
        <Text>Returned This Month: {stats.returnedThisMonth}</Text>

        <Text style={{ marginTop: 8, fontWeight: "700", color: "#b91c1c" }}>
          Overdue (14+ days): {stats.overdueCount}
        </Text>
      </View>

      {/* Placeholder chart */}
      <View
        style={{
          backgroundColor: "white",
          padding: 16,
          borderRadius: 14,
          marginBottom: 20,
          elevation: 3,
        }}
      >
        <Text style={{ fontWeight: "800", fontSize: 16, marginBottom: 8 }}>
          Activity (Placeholder)
        </Text>
        <Text style={{ color: "#6b7280" }}>Charts will be added in Phase 2.</Text>
      </View>

      {/* Quick Actions */}
      <Text style={{ fontWeight: "800", fontSize: 18, marginBottom: 10 }}>Quick Actions</Text>

      <View style={{ flexDirection: "row", flexWrap: "wrap", marginBottom: 50 }}>
        <ActionCard label="Borrow" color="#1e3a8a" onPress={() => router.push("/borrow")} />
        <ActionCard label="Return" color="#065f46" onPress={() => router.push("/return")} />
        <ActionCard label="Books" color="#0ea5a4" onPress={() => router.push("/books/list")} />
        <ActionCard label="Users" color="#2563eb" onPress={() => router.push("/users/list")} />
        <ActionCard label="Transactions" color="#374151" onPress={() => router.push("/transactions")} />
        <ActionCard label="Print Report" color="#6e621cff" onPress={() => router.push("/reports")} />
        <ActionCard label="Inventory" color="#401c6eff" onPress={() => router.push("/books/inventory")} />

        {/* NEW added modules */}
        <ActionCard
          label="My Shifts Today"
          color="#7c3aed"
          onPress={() => router.push("/librarian/shifts")}
        />
        <ActionCard
          label="Attendance"
          color="#c026d3"
          onPress={() => router.push("/librarian/shifts")}
        />
        <ActionCard
          label="Attendance History"
          color="#9333ea"
          onPress={() => router.push("/librarian/shifts/history")}
        />
      </View>
    </ScrollView>
  );
}
