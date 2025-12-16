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
  Dimensions,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons, MaterialIcons, FontAwesome5 } from "@expo/vector-icons";

import { getDashboardStats, DashboardStats } from "../../db/dashboard";
import { getSession, clearSession } from "../../lib/session";
import { getLibrarianByUsername } from "../../db/queries/librarians";
import { events } from "../../utils/events";
import { syncAll, getSyncStatus } from "../../lib/syncEngine";

const { width } = Dimensions.get("window");

// Define the Librarian type based on your database schema
interface Librarian {
  id: number;
  username: string;
  role: string;
  // Add other properties as per your schema
}

export default function HomeDashboard() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [userDisplayName, setUserDisplayName] = useState("");

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
        
        if (user) {
          // Check if user has a name property, otherwise use username
          // Adjust this based on your actual Librarian type
          const displayName = (user as any).name || 
                             (user as any).full_name || 
                             user.username;
          setUserDisplayName(displayName);
          setIsAdmin(user.role === "admin");
        } else {
          // Fallback to session username if user not found
          setUserDisplayName(session.username);
        }
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

  const handleSync = async () => {
    setSyncLoading(true);
    try {
      const result = await syncAll();

      if (result.success) {
        Alert.alert("Synced", "Cloud sync completed successfully.", [
          { text: "OK", style: "default" }
        ]);
      } else {
        Alert.alert("Sync Failed", "Check internet and try again.", [
          { text: "OK", style: "cancel" }
        ]);
      }
    } catch (err) {
      Alert.alert("Error", "Sync error occurred.", [
        { text: "OK", style: "destructive" }
      ]);
    } finally {
      setSyncLoading(false);
      loadSyncStatus();
    }
  };

  const getStatusColor = () => {
    if (syncLoading) return "#f59e0b"; // amber while syncing
    if (syncStatus.pending > 0) return "#ef4444"; // red
    return "#10b981"; // emerald
  };

  const getLastSyncTime = () => {
    const last = syncStatus.lastPull || syncStatus.lastPush;
    if (!last) return "Never synced";
    
    const date = new Date(last);
    const now = new Date();
    const diffMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffMinutes < 1) return "Just now";
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    if (diffMinutes < 1440) return `${Math.floor(diffMinutes / 60)}h ago`;
    return date.toLocaleDateString();
  };

  if (loading || !stats) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4f46e5" />
        <Text style={styles.loadingText}>Loading Dashboard...</Text>
      </View>
    );
  }

  const StatCard = ({ 
    title, 
    value, 
    subtitle, 
    color,
    icon 
  }: {
    title: string;
    value: number;
    subtitle?: string;
    color?: string;
    icon: React.ReactNode;
  }) => (
    <View style={styles.statCard}>
      <View style={[styles.statIconContainer, { backgroundColor: color + '15' }]}>
        {icon}
      </View>
      <View style={styles.statContent}>
        <Text style={styles.statValue} numberOfLines={1}>
          {value.toLocaleString()}
        </Text>
        <Text style={styles.statTitle}>{title}</Text>
        {subtitle && <Text style={styles.statSubtitle}>{subtitle}</Text>}
      </View>
    </View>
  );

  const QuickActionButton = ({ 
    label, 
    path, 
    color, 
    icon 
  }: {
    label: string;
    path: string;
    color: string;
    icon: string;
  }) => (
    <TouchableOpacity
      style={[styles.quickAction, { backgroundColor: color }]}
      onPress={() => router.push(path as any)}
      activeOpacity={0.7}
    >
      <MaterialIcons name={icon as any} size={24} color="white" />
      <Text style={styles.quickActionText} numberOfLines={2}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  return (
    <>
      <ScrollView 
        style={styles.container}
        showsVerticalScrollIndicator={false}
      >
        {/* HEADER WITH USER INFO */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Welcome back,</Text>
            <Text style={styles.userName}>{userDisplayName}</Text>
          </View>
          <TouchableOpacity
            style={styles.syncStatus}
            onPress={handleSync}
            disabled={syncLoading}
          >
            <View style={[styles.syncDot, { backgroundColor: getStatusColor() }]} />
            <Text style={styles.syncText}>
              {syncLoading ? "Syncing..." : 
               syncStatus.pending > 0 ? `${syncStatus.pending} pending` : "Synced"}
            </Text>
            {syncStatus.pending > 0 && (
              <View style={styles.pendingBadge}>
                <Text style={styles.pendingText}>{syncStatus.pending}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Admin Panel Button */}
        {isAdmin && (
          <TouchableOpacity
            onPress={() => router.push("/admin")}
            style={styles.adminButton}
            activeOpacity={0.8}
          >
            <Ionicons name="shield-checkmark" size={20} color="white" />
            <Text style={styles.adminButtonText}>Administration Panel</Text>
            <Ionicons name="chevron-forward" size={20} color="white" />
          </TouchableOpacity>
        )}

        {/* STATS GRID */}
        <View style={styles.statsGrid}>
          <StatCard
            title="Total Books"
            value={stats.totalBooks}
            color="#4f46e5"
            icon={<Ionicons name="library" size={24} color="#4f46e5" />}
          />
          <StatCard
            title="Total Users"
            value={stats.totalUsers}
            color="#0ea5a4"
            icon={<FontAwesome5 name="users" size={20} color="#0ea5a4" />}
          />
          <StatCard
            title="Active Borrows"
            value={stats.activeBorrows}
            color="#ef4444"
            subtitle={`${stats.availableCopies} available`}
            icon={<MaterialIcons name="bookmark" size={24} color="#ef4444" />}
          />
          <StatCard
            title="Overdue"
            value={stats.overdueCount}
            color="#dc2626"
            subtitle="14+ days"
            icon={<MaterialIcons name="warning" size={24} color="#dc2626" />}
          />
        </View>

        {/* BORROWING OVERVIEW */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Borrowing Overview</Text>
          <View style={styles.overviewCard}>
            <View style={styles.overviewRow}>
              <View style={styles.overviewItem}>
                <Text style={styles.overviewValue}>{stats.returnedToday}</Text>
                <Text style={styles.overviewLabel}>Returned Today</Text>
              </View>
              <View style={styles.divider} />
              <View style={styles.overviewItem}>
                <Text style={styles.overviewValue}>{stats.returnedThisMonth}</Text>
                <Text style={styles.overviewLabel}>This Month</Text>
              </View>
            </View>
            <View style={styles.lastSync}>
              <Ionicons name="time-outline" size={14} color="#6b7280" />
              <Text style={styles.lastSyncText}>
                Last sync: {getLastSyncTime()}
              </Text>
            </View>
          </View>
        </View>

        {/* QUICK ACTIONS */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.actionsGrid}>
            <QuickActionButton
              label="Borrow Book"
              path="/borrow"
              color="#4f46e5"
              icon="book"
            />
            <QuickActionButton
              label="Return Book"
              path="/return"
              color="#059669"
              icon="assignment-return"
            />
            <QuickActionButton
              label="Books"
              path="/books/list"
              color="#0ea5a4"
              icon="menu-book"
            />
            <QuickActionButton
              label="Users"
              path="/users/list"
              color="#2563eb"
              icon="people"
            />
            <QuickActionButton
              label="Transactions"
              path="/transactions"
              color="#374151"
              icon="receipt"
            />
            <QuickActionButton
              label="Print Report"
              path="/reports"
              color="#d97706"
              icon="print"
            />
            <QuickActionButton
              label="Inventory"
              path="/books/inventory"
              color="#7c3aed"
              icon="inventory"
            />
            <QuickActionButton
              label="Shifts"
              path="/librarian/shifts"
              color="#db2777"
              icon="schedule"
            />
            <QuickActionButton
              label="Attendance"
              path="/librarian/shifts/history"
              color="#dc2626"
              icon="history"
            />
          </View>
        </View>

        {/* LOGOUT SECTION */}
        <View style={styles.logoutSection}>
          <View style={styles.logoutCard}>
            <View style={styles.logoutHeader}>
              <Ionicons name="log-out-outline" size={24} color="#dc2626" />
              <View style={styles.logoutTexts}>
                <Text style={styles.logoutTitle}>Session Control</Text>
                <Text style={styles.logoutSubtitle}>
                  {userDisplayName} • {isAdmin ? "Administrator" : "Librarian"}
                </Text>
              </View>
            </View>
            <TouchableOpacity
              style={styles.logoutButton}
              onPress={async () => {
                Alert.alert(
                  "Logout Confirmation",
                  "Are you sure you want to logout?",
                  [
                    { 
                      text: "Cancel", 
                      style: "cancel",
                      onPress: () => console.log("Cancel Pressed")
                    },
                    {
                      text: "Logout",
                      style: "destructive",
                      onPress: async () => {
                        await clearSession();
                        router.replace("/auth/login");
                      },
                    },
                  ],
                  { cancelable: true }
                );
              }}
              activeOpacity={0.7}
            >
              <Text style={styles.logoutButtonText}>Logout</Text>
              <Ionicons name="log-out" size={18} color="white" />
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* FLOATING SYNC BUTTON */}
      <TouchableOpacity
        style={[
          styles.fab,
          syncLoading && styles.fabSyncing,
          syncStatus.pending > 0 && styles.fabPending
        ]}
        onPress={handleSync}
        disabled={syncLoading}
        activeOpacity={0.8}
      >
        {syncLoading ? (
          <ActivityIndicator color="white" size="small" />
        ) : (
          <>
            <Ionicons 
              name={syncStatus.pending > 0 ? "cloud-upload" : "cloud-done"} 
              size={24} 
              color="white" 
            />
            {syncStatus.pending > 0 && (
              <View style={styles.fabBadge}>
                <Text style={styles.fabBadgeText}>{syncStatus.pending}</Text>
              </View>
            )}
          </>
        )}
      </TouchableOpacity>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f8fafc",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: "#64748b",
    fontWeight: "500",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    backgroundColor: "white",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  greeting: {
    fontSize: 14,
    color: "#64748b",
    fontWeight: "500",
    marginBottom: 2,
  },
  userName: {
    fontSize: 22,
    fontWeight: "700",
    color: "#1e293b",
  },
  syncStatus: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f1f5f9",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    minWidth: 100,
  },
  syncDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  syncText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#475569",
  },
  pendingBadge: {
    position: "absolute",
    top: -6,
    right: -6,
    backgroundColor: "#ef4444",
    width: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "white",
  },
  pendingText: {
    color: "white",
    fontSize: 10,
    fontWeight: "700",
  },
  adminButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#4f46e5",
    paddingVertical: 14,
    marginHorizontal: 20,
    marginTop: 12,
    marginBottom: 20,
    borderRadius: 12,
    gap: 8,
    shadowColor: "#4f46e5",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  adminButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 16,
    marginBottom: 24,
    gap: 12,
  },
  statCard: {
    width: (width - 40) / 2,
    backgroundColor: "white",
    borderRadius: 16,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  statIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  statContent: {
    flex: 1,
  },
  statValue: {
    fontSize: 24,
    fontWeight: "800",
    color: "#1e293b",
    marginBottom: 2,
  },
  statTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#64748b",
  },
  statSubtitle: {
    fontSize: 12,
    color: "#94a3b8",
    marginTop: 2,
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1e293b",
    marginBottom: 12,
  },
  overviewCard: {
    backgroundColor: "white",
    borderRadius: 16,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  overviewRow: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  overviewItem: {
    alignItems: "center",
    flex: 1,
  },
  overviewValue: {
    fontSize: 32,
    fontWeight: "800",
    color: "#4f46e5",
    marginBottom: 4,
  },
  overviewLabel: {
    fontSize: 14,
    color: "#64748b",
    fontWeight: "500",
  },
  divider: {
    width: 1,
    backgroundColor: "#e2e8f0",
  },
  lastSync: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
    gap: 6,
  },
  lastSyncText: {
    fontSize: 12,
    color: "#6b7280",
    fontWeight: "500",
  },
  actionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  quickAction: {
    width: (width - 52) / 3,
    aspectRatio: 1,
    borderRadius: 16,
    padding: 12,
    justifyContent: "space-between",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  quickActionText: {
    color: "white",
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 16,
  },
  logoutSection: {
    paddingHorizontal: 20,
    marginBottom: 40,
    marginTop: 8,
  },
  logoutCard: {
    backgroundColor: "white",
    borderRadius: 16,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    borderLeftWidth: 4,
    borderLeftColor: "#dc2626",
  },
  logoutHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
    gap: 12,
  },
  logoutTexts: {
    flex: 1,
  },
  logoutTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1e293b",
    marginBottom: 2,
  },
  logoutSubtitle: {
    fontSize: 14,
    color: "#64748b",
  },
  logoutButton: {
    backgroundColor: "#dc2626",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  logoutButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "700",
  },
  fab: {
    position: "absolute",
    bottom: 24,
    right: 20,
    backgroundColor: "#4f46e5",
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#4f46e5",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  fabSyncing: {
    backgroundColor: "#f59e0b",
  },
  fabPending: {
    backgroundColor: "#ef4444",
  },
  fabBadge: {
    position: "absolute",
    top: -4,
    right: -4,
    backgroundColor: "#dc2626",
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "white",
    paddingHorizontal: 4,
  },
  fabBadgeText: {
    color: "white",
    fontSize: 10,
    fontWeight: "700",
  },
});