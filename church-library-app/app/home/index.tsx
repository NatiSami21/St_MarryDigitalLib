// app/home/index.tsx
import React, { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
  Alert,
  Dimensions,
  Animated,
  StatusBar,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons, MaterialIcons, FontAwesome5, MaterialCommunityIcons } from "@expo/vector-icons";
import { SafeAreaProvider, SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { getDashboardStats, DashboardStats } from "../../db/dashboard";
import { getSession, clearSession } from "../../lib/session";
import { getLibrarianByUsername } from "../../db/queries/librarians";
import { events } from "../../utils/events";
import { syncAll, getSyncStatus } from "../../lib/syncEngine";

const { width, height } = Dimensions.get("window");

// Navigation drawer width
const DRAWER_WIDTH = width * 0.75;

interface Librarian {
  id: number;
  username: string;
  role: string;
  name?: string;
  full_name?: string;
}

// Main Home Component
function HomeContent() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [userDisplayName, setUserDisplayName] = useState("");
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [activeTab, setActiveTab] = useState("dashboard");

  // Animation values
  const drawerAnimation = useRef(new Animated.Value(-DRAWER_WIDTH)).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;

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
          const displayName = (user as Librarian).name || 
                             (user as Librarian).full_name || 
                             user.username;
          setUserDisplayName(displayName);
          setIsAdmin(user.role === "admin");
        } else {
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

  // Toggle drawer animation
  useEffect(() => {
    if (drawerVisible) {
      Animated.parallel([
        Animated.timing(drawerAnimation, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(overlayOpacity, {
          toValue: 0.5,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(drawerAnimation, {
          toValue: -DRAWER_WIDTH,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(overlayOpacity, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [drawerVisible]);

  const handleSync = async () => {
    setSyncLoading(true);
    try {
      const result = await syncAll();

      if (result.success) {
        Alert.alert(
          "Sync Complete",
          "All data has been synchronized with the cloud.",
          [{ text: "OK", style: "default" }]
        );
      } else {
        Alert.alert(
          "Sync Failed",
          "Please check your internet connection and try again.",
          [{ text: "OK", style: "cancel" }]
        );
      }
    } catch (err) {
      Alert.alert(
        "Sync Error",
        "An unexpected error occurred during synchronization.",
        [{ text: "OK", style: "destructive" }]
      );
    } finally {
      setSyncLoading(false);
      loadSyncStatus();
    }
  };

  const getStatusColor = () => {
    if (syncLoading) return "#F39C12"; // amber while syncing
    if (syncStatus.pending > 0) return "#E74C3C"; // red
    return "#27AE60"; // green
  };

  const getStatusIcon = () => {
    if (syncLoading) return "sync";
    if (syncStatus.pending > 0) return "cloud-upload";
    return "cloud-done";
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

  const handleTabPress = (tab: string, path: string) => {
    setActiveTab(tab);
    router.push(path as any);
    setDrawerVisible(false);
  };

  const handleLogout = async () => {
    Alert.alert(
      "Logout Confirmation",
      "Are you sure you want to logout from the library system?",
      [
        { 
          text: "Cancel", 
          style: "cancel",
        },
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
  };

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
      <View style={styles.statIconContainer}>
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
      style={styles.quickAction}
      onPress={() => {
        router.push(path as any);
        setDrawerVisible(false);
      }}
      activeOpacity={0.7}
    >
      <View style={[styles.quickActionIcon, { backgroundColor: color }]}>
        <MaterialIcons name={icon as any} size={24} color="#FFFFFF" />
      </View>
      <Text style={styles.quickActionText} numberOfLines={2}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  const NavItem = ({ 
    icon, 
    label, 
    path, 
    tab, 
    isAdminOnly = false 
  }: {
    icon: string;
    label: string;
    path: string;
    tab: string;
    isAdminOnly?: boolean;
  }) => {
    if (isAdminOnly && !isAdmin) return null;
    
    return (
      <TouchableOpacity
        style={[
          styles.navItem,
          activeTab === tab && styles.navItemActive
        ]}
        onPress={() => handleTabPress(tab, path)}
      >
        <Ionicons 
          name={icon as any} 
          size={24} 
          color={activeTab === tab ? "#D4AF37" : "#003153"} 
        />
        <Text style={[
          styles.navItemText,
          activeTab === tab && styles.navItemTextActive
        ]}>
          {label}
        </Text>
      </TouchableOpacity>
    );
  };

  if (loading || !stats) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#003153" />
        <Text style={styles.loadingText}>Loading Library Dashboard...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor="#003153" barStyle="light-content" />
      
      {/* Navigation Drawer */}
      <Animated.View style={[
        styles.drawer,
        { transform: [{ translateX: drawerAnimation }] }
      ]}>
        <View style={styles.drawerHeader}>
          <View style={styles.drawerUserInfo}>
            <View style={styles.userAvatar}>
              <Ionicons name="person" size={32} color="#003153" />
            </View>
            <View style={styles.userDetails}>
              <Text style={styles.drawerUserName}>{userDisplayName}</Text>
              <Text style={styles.drawerUserRole}>
                {isAdmin ? "Administrator" : "Librarian"}
              </Text>
            </View>
          </View>
          <TouchableOpacity
            onPress={() => setDrawerVisible(false)}
            style={styles.drawerCloseButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="close" size={24} color="#003153" />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.drawerContent}>
          {/* Main Navigation */}
          <Text style={styles.drawerSectionTitle}>MAIN NAVIGATION</Text>
          <NavItem icon="home" label="Dashboard" path="/home" tab="dashboard" />
          <NavItem icon="book" label="Books" path="/books/list" tab="books" />
          <NavItem icon="people" label="Users" path="/users/list" tab="users" />
          <NavItem icon="swap-horizontal" label="Transactions" path="/transactions" tab="transactions" />
          <NavItem icon="stats-chart" label="Reports" path="/reports" tab="reports" />
          <NavItem icon="calendar" label="Shifts" path="/librarian/shifts" tab="myshifts" />

          {/* Administration Section */}
          {isAdmin && (
            <>
              <Text style={styles.drawerSectionTitle}>ADMINISTRATION</Text>
              <NavItem icon="shield-checkmark" label="Admin Panel" path="/admin" tab="admin" />
              <NavItem icon="person-add" label="Manage Librarians" path="/admin/librarians" tab="librarians" />
              <NavItem icon="time" label="Shift Management" path="/admin/shifts" tab="shifts" />
              <NavItem icon="sync" label="Sync Control" path="/admin/sync" tab="sync" />
            </>
          )}
          
          {/* Support Section */}
          <Text style={styles.drawerSectionTitle}>SUPPORT</Text>
          <TouchableOpacity style={styles.navItem}>
            <Ionicons name="help-circle" size={24} color="#003153" />
            <Text style={styles.navItemText}>Help & Guides</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.navItem}>
            <Ionicons name="information-circle" size={24} color="#003153" />
            <Text style={styles.navItemText}>About FAYDA</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.navItem}>
            <Ionicons name="settings" size={24} color="#003153" />
            <Text style={styles.navItemText}>Settings</Text>
          </TouchableOpacity>
        </ScrollView>

        <View style={styles.drawerFooter}>
          <TouchableOpacity 
            style={styles.logoutButton}
            onPress={handleLogout}
          >
            <Ionicons name="log-out-outline" size={20} color="#FFFFFF" />
            <Text style={styles.logoutButtonText}>Logout</Text>
          </TouchableOpacity>
          <Text style={styles.drawerVersion}>FAYDA v1.0 • DiguwaSoft</Text>
        </View>
      </Animated.View>

      {/* Overlay */}
      <Animated.View 
        style={[styles.overlay, { opacity: overlayOpacity }]}
        pointerEvents={drawerVisible ? 'auto' : 'none'}
      >
        <TouchableOpacity 
          style={StyleSheet.absoluteFill}
          onPress={() => setDrawerVisible(false)}
          activeOpacity={1}
        />
      </Animated.View>

      {/* Main Content */}
      <SafeAreaView style={styles.mainContent} edges={['top', 'left', 'right']}>
        {/* Top Navigation Bar */}
        <View style={[styles.topNav, { paddingTop: insets.top }]}>
          <TouchableOpacity
            onPress={() => setDrawerVisible(true)}
            style={styles.menuButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="menu" size={28} color="#003153" />
          </TouchableOpacity>
          
          <View style={styles.topNavCenter}>
            <Text style={styles.topNavTitle}>FAYDA </Text>
            <Text style={styles.topNavSubtitle}>Smart Library Management</Text>
          </View>
          
          <TouchableOpacity
            style={styles.userBadge}
            onPress={() => setDrawerVisible(true)}
          >
            <Ionicons name="person-circle" size={32} color="#003153" />
          </TouchableOpacity>
        </View>

        {/* Dashboard Content */}
        <ScrollView 
          style={styles.dashboardContent}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.contentContainer}
        >
          {/* Welcome Card */}
          <View style={styles.welcomeCard}>
            <View>
              <Text style={styles.welcomeGreeting}>Welcome back,</Text>
              <Text style={styles.userName}>{userDisplayName}</Text>
              <Text style={styles.welcomeSubtitle}>
                {isAdmin ? "Administrator Access" : "Librarian Access"}
              </Text>
            </View>
            <View style={styles.welcomeBadge}>
              <Ionicons name="library" size={24} color="#D4AF37" />
            </View>
          </View>

          {/* Sync Status Card */}
          <TouchableOpacity
            style={styles.syncCard}
            onPress={handleSync}
            disabled={syncLoading}
          >
            <View style={styles.syncHeader}>
              <Ionicons 
                name={getStatusIcon() as any} 
                size={24} 
                color={getStatusColor()} 
              />
              <View style={styles.syncTextContainer}>
                <Text style={styles.syncTitle}>
                  {syncLoading ? "Syncing in progress..." : 
                   syncStatus.pending > 0 ? "Sync Required" : "All Systems Synced"}
                </Text>
                <Text style={styles.syncSubtitle}>
                  {syncStatus.pending > 0 
                    ? `${syncStatus.pending} pending changes` 
                    : `Last sync: ${getLastSyncTime()}`}
                </Text>
              </View>
            </View>
            {syncStatus.pending > 0 && (
              <View style={styles.syncBadge}>
                <Text style={styles.syncBadgeText}>{syncStatus.pending}</Text>
              </View>
            )}
          </TouchableOpacity>

          {/* Stats Grid */}
          <Text style={styles.sectionTitle}>Library Overview</Text>
          <View style={styles.statsGrid}>
            <StatCard
              title="Total Books"
              value={stats.totalBooks}
              icon={<Ionicons name="library" size={28} color="#003153" />}
            />
            <StatCard
              title="Total Users"
              value={stats.totalUsers}
              icon={<FontAwesome5 name="users" size={24} color="#005B82" />}
            />
            <StatCard
              title="Active Borrows"
              value={stats.activeBorrows}
              subtitle={`${stats.availableCopies} available`}
              icon={<MaterialIcons name="bookmark" size={28} color="#D4AF37" />}
            />
            <StatCard
              title="Overdue"
              value={stats.overdueCount}
              subtitle="14+ days"
              icon={<MaterialIcons name="warning" size={28} color="#E74C3C" />}
            />
          </View>

          {/* Quick Actions */}
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.actionsGrid}>
            <QuickActionButton
              label="Borrow Book"
              path="/borrow"
              color="#005B82"
              icon="book"
            />
            <QuickActionButton
              label="Return Book"
              path="/return"
              color="#005B82"
              icon="assignment-return"
            />
            <QuickActionButton
              label="Add Book"
              path="/books/register"
              color="#005B82"
              icon="add"
            />
            <QuickActionButton
              label="Register User"
              path="/users/register"
              color="#005B82"
              icon="person-add"
            />
            <QuickActionButton
              label="Inventory"
              path="/books/inventory"
              color="#005B82"
              icon="import-contacts"
            />
            <QuickActionButton
              label="Generate Report"
              path="/reports"
              color="#005B82"
              icon="print"
            />
          </View>

          {/* Activity Overview */}
          <View style={styles.activityCard}>
            <Text style={styles.activityTitle}>Today's Activity</Text>
            <View style={styles.activityStats}>
              <View style={styles.activityStat}>
                <Text style={styles.activityValue}>{stats.returnedToday}</Text>
                <Text style={styles.activityLabel}>Books Returned</Text>
              </View>
              <View style={styles.activityDivider} />
              <View style={styles.activityStat}>
                <Text style={styles.activityValue}>{stats.activeBorrows}</Text>
                <Text style={styles.activityLabel}>Active Loans</Text>
              </View>
              <View style={styles.activityDivider} />
              <View style={styles.activityStat}>
                <Text style={styles.activityValue}>{stats.overdueCount}</Text>
                <Text style={styles.activityLabel}>Overdue Items</Text>
              </View>
            </View>
          </View>
        </ScrollView>

        {/* Bottom Tab Bar - Using SafeAreaView for bottom */}
        <SafeAreaView style={styles.tabBarContainer} edges={['bottom']}>
          <View style={styles.tabBar}>
            <TouchableOpacity 
              style={styles.tabItem}
              onPress={() => handleTabPress("dashboard", "/home")}
            >
              <Ionicons 
                name="home" 
                size={24} 
                color={activeTab === "dashboard" ? "#D4AF37" : "#7F8C8D"} 
              />
              <Text style={[
                styles.tabLabel,
                activeTab === "dashboard" && styles.tabLabelActive
              ]}>Home</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.tabItem}
              onPress={() => handleTabPress("books", "/books/list")}
            >
              <Ionicons 
                name="book" 
                size={24} 
                color={activeTab === "books" ? "#D4AF37" : "#7F8C8D"} 
              />
              <Text style={[
                styles.tabLabel,
                activeTab === "books" && styles.tabLabelActive
              ]}>Books</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.tabItem}
              onPress={() => handleTabPress("users", "/users/list")}
            >
              <Ionicons 
                name="people" 
                size={24} 
                color={activeTab === "users" ? "#D4AF37" : "#7F8C8D"} 
              />
              <Text style={[
                styles.tabLabel,
                activeTab === "users" && styles.tabLabelActive
              ]}>Users</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.tabItem}
              onPress={() => handleTabPress("transactions", "/transactions")}
            >
              <MaterialCommunityIcons 
                name="swap-horizontal" 
                size={24} 
                color={activeTab === "transactions" ? "#D4AF37" : "#7F8C8D"} 
              />
              <Text style={[
                styles.tabLabel,
                activeTab === "transactions" && styles.tabLabelActive
              ]}>Transactions</Text>
            </TouchableOpacity>
            
            {isAdmin && (
              <TouchableOpacity 
                style={styles.tabItem}
                onPress={() => handleTabPress("admin", "/admin")}
              >
                <Ionicons 
                  name="shield-checkmark" 
                  size={24} 
                  color={activeTab === "admin" ? "#D4AF37" : "#7F8C8D"} 
                />
                <Text style={[
                  styles.tabLabel,
                  activeTab === "admin" && styles.tabLabelActive
                ]}>Admin</Text>
              </TouchableOpacity>
            )}
          </View>
        </SafeAreaView>

        {/* Floating Action Button (Sync) */}
        <TouchableOpacity
          style={[
            styles.fab,
            syncLoading && styles.fabSyncing,
            syncStatus.pending > 0 && styles.fabPending,
            { bottom: insets.bottom + 80 } // Position above tab bar considering safe area
          ]}
          onPress={handleSync}
          disabled={syncLoading}
          activeOpacity={0.8}
        >
          {syncLoading ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <>
              <Ionicons 
                name={syncStatus.pending > 0 ? "cloud-upload" : "cloud-done"} 
                size={28} 
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
      </SafeAreaView>
    </View>
  );
}

// Main Export Component
export default function HomeDashboard() {
  return (
    <SafeAreaProvider>
      <HomeContent />
    </SafeAreaProvider>
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
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: "#003153",
    fontWeight: "500",
  },
  
  // Drawer Styles
  drawer: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: DRAWER_WIDTH,
    backgroundColor: "#FFFFFF",
    zIndex: 1000,
    elevation: 20,
    shadowColor: "#000",
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
  },
  drawerHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 24,
    paddingTop: 60,
    backgroundColor: "#F8FAFC",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E0D5",
  },
  drawerUserInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  userAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#F0F7FF",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  userDetails: {
    flex: 1,
  },
  drawerUserName: {
    fontSize: 18,
    fontWeight: "700",
    color: "#003153",
    marginBottom: 4,
  },
  drawerUserRole: {
    fontSize: 14,
    color: "#005B82",
    fontWeight: "500",
  },
  drawerCloseButton: {
    padding: 8,
  },
  drawerContent: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 20,
  },
  drawerSectionTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: "#7F8C8D",
    marginTop: 20,
    marginBottom: 12,
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  navItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 4,
    borderRadius: 12,
  },
  navItemActive: {
    backgroundColor: "#F0F7FF",
    borderLeftWidth: 4,
    borderLeftColor: "#D4AF37",
  },
  navItemText: {
    fontSize: 16,
    color: "#003153",
    fontWeight: "500",
    marginLeft: 16,
  },
  navItemTextActive: {
    color: "#003153",
    fontWeight: "700",
  },
  drawerFooter: {
    padding: 24,
    borderTopWidth: 1,
    borderTopColor: "#E5E0D5",
    backgroundColor: "#FFFFFF",
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#E74C3C",
    paddingVertical: 14,
    borderRadius: 12,
    marginBottom: 16,
  },
  logoutButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 8,
  },
  drawerVersion: {
    fontSize: 12,
    color: "#7F8C8D",
    textAlign: "center",
    fontStyle: "italic",
  },
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "#000000",
    zIndex: 999,
  },
  
  // Main Content Styles
  mainContent: {
    flex: 1,
  },
  topNav: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 20,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E0D5",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  menuButton: {
    padding: 8,
  },
  topNavCenter: {
    alignItems: "center",
  },
  topNavTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#003153",
    letterSpacing: 0.5,
  },
  topNavSubtitle: {
    fontSize: 12,
    color: "#005B82",
    marginTop: 2,
  },
  userBadge: {
    padding: 8,
  },
  dashboardContent: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 20,
  },
  
  // Welcome Card
  welcomeCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 24,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#E5E0D5",
    shadowColor: "#003153",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 5,
  },
  welcomeGreeting: {
    fontSize: 14,
    color: "#7F8C8D",
    fontWeight: "500",
    marginBottom: 4,
  },
  userName: {
    fontSize: 28,
    fontWeight: "700",
    color: "#003153",
    marginBottom: 4,
  },
  welcomeSubtitle: {
    fontSize: 14,
    color: "#005B82",
    fontWeight: "500",
  },
  welcomeBadge: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#FFF5E1",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#D4AF37",
  },
  
  // Sync Card
  syncCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: "#E5E0D5",
    shadowColor: "#003153",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  syncHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  syncTextContainer: {
    marginLeft: 16,
  },
  syncTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#003153",
    marginBottom: 2,
  },
  syncSubtitle: {
    fontSize: 14,
    color: "#7F8C8D",
  },
  syncBadge: {
    backgroundColor: "#E74C3C",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  syncBadgeText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
  
  // Section Title
  sectionTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#003153",
    marginBottom: 16,
    marginTop: 8,
  },
  
  // Stats Grid
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 24,
    gap: 16,
  },
  statCard: {
    width: (width - 56) / 2,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: "#E5E0D5",
    shadowColor: "#003153",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  statIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: "#F0F7FF",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  statContent: {
    flex: 1,
  },
  statValue: {
    fontSize: 32,
    fontWeight: "800",
    color: "#003153",
    marginBottom: 4,
  },
  statTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#003153",
  },
  statSubtitle: {
    fontSize: 14,
    color: "#7F8C8D",
    marginTop: 4,
  },
  
  // Quick Actions Grid
  actionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 16,
    marginBottom: 24,
  },
  quickAction: {
    width: (width - 56) / 3,
    alignItems: "center",
  },
  quickActionIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  quickActionText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#003153",
    textAlign: "center",
    lineHeight: 18,
  },
  
  // Activity Card
  activityCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 24,
    marginBottom: 40,
    borderWidth: 1,
    borderColor: "#E5E0D5",
    shadowColor: "#003153",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 5,
  },
  activityTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#003153",
    marginBottom: 20,
  },
  activityStats: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  activityStat: {
    alignItems: "center",
    flex: 1,
  },
  activityValue: {
    fontSize: 32,
    fontWeight: "800",
    color: "#D4AF37",
    marginBottom: 4,
  },
  activityLabel: {
    fontSize: 14,
    color: "#7F8C8D",
    textAlign: "center",
  },
  activityDivider: {
    width: 1,
    backgroundColor: "#E5E0D5",
  },
  
  // Tab Bar Container
  tabBarContainer: {
    backgroundColor: "#FFFFFF",
  },
  // Bottom Tab Bar
  tabBar: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#E5E0D5",
    paddingVertical: 12,
    paddingHorizontal: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 10,
  },
  tabItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  tabLabel: {
    fontSize: 12,
    color: "#7F8C8D",
    marginTop: 4,
    fontWeight: "500",
  },
  tabLabelActive: {
    color: "#D4AF37",
    fontWeight: "700",
  },
  
  // Floating Action Button
  fab: {
    position: "absolute",
    right: 20,
    backgroundColor: "#003153",
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#003153",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 10,
    zIndex: 100,
  },
  fabSyncing: {
    backgroundColor: "#F39C12",
  },
  fabPending: {
    backgroundColor: "#E74C3C",
  },
  fabBadge: {
    position: "absolute",
    top: -8,
    right: -8,
    backgroundColor: "#E74C3C",
    minWidth: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderColor: "#FFFFFF",
    paddingHorizontal: 6,
  },
  fabBadgeText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "800",
  },
});