// church-library-app/app/admin/index.tsx
import React, { useEffect, useState } from "react";
import { 
  View, 
  Text, 
  ScrollView, 
  TouchableOpacity, 
  ActivityIndicator,
  StyleSheet,
  SafeAreaView 
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

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
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1e3a8a" />
      </View>
    );
  }

  const MenuButton = ({ title, subtitle, onPress, color }: any) => (
    <TouchableOpacity
      onPress={onPress}
      style={[
        styles.menuButton,
        color === "#b91c1c" && styles.dangerButton
      ]}
    >
      <View style={styles.buttonContent}>
        <Text style={[styles.menuTitle, color && { color }]}>
          {title}
        </Text>
        {subtitle && (
          <Text style={styles.menuSubtitle}>
            {subtitle}
          </Text>
        )}
      </View>
      <Ionicons 
        name="chevron-forward" 
        size={24} 
        color={color || "#1e3a8a"} 
      />
    </TouchableOpacity>
  );

  const handleLogout = async () => {
    await clearSession();
    router.replace("/auth/login");
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header with Close Button */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.push("/home")}
          style={styles.closeButton}
          hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
        >
          <Ionicons name="close" size={32} color="#003153" />
        </TouchableOpacity>
        
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>Admin Panel</Text>
          <Text style={styles.headerSubtitle}>
            Logged in as <Text style={styles.adminName}>{adminName}</Text>
          </Text>
        </View>
        
        <TouchableOpacity
          onPress={handleLogout}
          style={styles.logoutButton}
        >
          <Ionicons name="log-out-outline" size={22} color="#b91c1c" />
        </TouchableOpacity>
      </View>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Welcome Section */}
        <View style={styles.welcomeCard}>
          <Ionicons name="shield-checkmark" size={40} color="#003153" />
          <View style={styles.welcomeText}>
            <Text style={styles.welcomeTitle}>Administrator Access</Text>
            <Text style={styles.welcomeDescription}>
              Full system control and management capabilities
            </Text>
          </View>
        </View>

        {/* SECTION TITLE */}
        <Text style={styles.sectionTitle}>System Management</Text>

        {/* MANAGEMENT CARDS */}
        <View style={styles.cardsContainer}>
          <MenuButton
            title="Manage Librarians"
            subtitle="Add, delete, update, reset PIN, assign device"
            onPress={() => router.push("/admin/librarians")}
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
            title="Attendance"
            subtitle="Daily staff attendance, lateness, login & logout times"
            onPress={() => router.push("/admin/attendance")}
          />

          <MenuButton
            title="Analytics"
            subtitle="Borrow frequency, top books, overdue trends, system health"
            onPress={() => router.push("./admin/analytics")}
          />
        </View>

        {/* DANGER ZONE SECTION */}
        <Text style={[styles.sectionTitle, styles.dangerSectionTitle]}>
          <Ionicons name="warning" size={20} color="#b91c1c" /> Danger Zone
        </Text>

        <View style={styles.dangerCard}>
          <TouchableOpacity
            style={styles.dangerButtonFull}
            onPress={handleLogout}
          >
            <Ionicons name="log-out-outline" size={22} color="#b91c1c" />
            <Text style={styles.dangerButtonText}>Logout Admin Session</Text>
          </TouchableOpacity>
          
          <Text style={styles.dangerNote}>
            This will end your admin session and return to login screen
          </Text>
        </View>

        {/* Quick Navigation */}
        <View style={styles.quickNav}>
          <TouchableOpacity
            style={styles.quickNavButton}
            onPress={() => router.push("/home")}
          >
            <Ionicons name="home" size={20} color="#003153" />
            <Text style={styles.quickNavText}>Dashboard Home</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.quickNavButton}
            onPress={() => router.push("/books/list")}
          >
            <Ionicons name="book" size={20} color="#003153" />
            <Text style={styles.quickNavText}>Book Catalog</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.quickNavButton}
            onPress={() => router.push("/users/list")}
          >
            <Ionicons name="people" size={20} color="#003153" />
            <Text style={styles.quickNavText}>User List</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FDFBF7",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FDFBF7",
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 15,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E0D5",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  closeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#F0F7FF",
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: "#003153",
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "900",
    color: "#003153",
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: 14,
    color: "#475569",
    marginTop: 2,
  },
  adminName: {
    fontWeight: "700",
    color: "#005B82",
  },
  logoutButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(185, 28, 28, 0.1)",
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: "rgba(185, 28, 28, 0.3)",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  welcomeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: "#E5E0D5",
    shadowColor: "#003153",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 5,
  },
  welcomeText: {
    flex: 1,
    marginLeft: 16,
  },
  welcomeTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#003153",
    marginBottom: 4,
  },
  welcomeDescription: {
    fontSize: 14,
    color: "#475569",
    lineHeight: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#1e3a8a",
    marginBottom: 16,
    marginTop: 8,
  },
  dangerSectionTitle: {
    color: "#b91c1c",
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardsContainer: {
    marginBottom: 24,
  },
  menuButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: "white",
    padding: 18,
    borderRadius: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E5E0D5",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  buttonContent: {
    flex: 1,
  },
  menuTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#1e3a8a",
    marginBottom: 4,
  },
  menuSubtitle: {
    fontSize: 13,
    color: "#6b7280",
    lineHeight: 18,
  },
  dangerButton: {
    borderColor: "rgba(185, 28, 28, 0.3)",
    backgroundColor: "rgba(185, 28, 28, 0.05)",
  },
  dangerCard: {
    backgroundColor: "rgba(185, 28, 28, 0.05)",
    borderRadius: 14,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: "rgba(185, 28, 28, 0.2)",
  },
  dangerButtonFull: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: "rgba(185, 28, 28, 0.1)",
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "rgba(185, 28, 28, 0.3)",
    gap: 12,
  },
  dangerButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#b91c1c",
  },
  dangerNote: {
    fontSize: 13,
    color: "#b91c1c",
    textAlign: 'center',
    fontStyle: 'italic',
  },
  quickNav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  quickNavButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: "#FFFFFF",
    padding: 12,
    borderRadius: 10,
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: "#E5E0D5",
    gap: 8,
  },
  quickNavText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#003153",
  },
});