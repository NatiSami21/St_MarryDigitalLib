// church-library-app/app/transactions/index.tsx

import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
  RefreshControl,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Feather';
import Ionicons from 'react-native-vector-icons/Ionicons';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

import {
  getAllTransactions,
  getActiveTransactions,
  getReturnedTransactions,
} from "../../db/transactions";
import { events } from "../../utils/events";
import { Theme } from "../../styles/theme";
import { getSession } from "../../lib/session";

// Define TypeScript interfaces
interface TransactionRecord {
  tx_id: string;
  book_title: string;
  book_code: string;
  borrowed_at: string;
  returned_at: string | null;
  user_name?: string;
  [key: string]: any;
}

export default function TransactionsScreen() {
  const [tab] = useState<"all" | "active" | "returned">("all");
  const [activeTab, setActiveTab] = useState(tab);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [records, setRecords] = useState<TransactionRecord[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [activeMainTab, setActiveMainTab] = useState("transactions");
  const router = useRouter();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    loadData();
    checkUserRole();
  }, [activeTab]);

  useEffect(() => {
    const sub = events.listen("refresh-transactions", loadData);
    return () => sub.remove();
  }, []);

  const checkUserRole = async () => {
    const session = await getSession();
    if (session?.role === "admin") {
      setIsAdmin(true);
    }
  };

  const loadData = async () => {
    setLoading(true);
    let data: TransactionRecord[] = [];

    if (activeTab === "all") data = await getAllTransactions() as TransactionRecord[];
    if (activeTab === "active") data = await getActiveTransactions() as TransactionRecord[];
    if (activeTab === "returned") data = await getReturnedTransactions() as TransactionRecord[];

    setRecords(data);
    setLoading(false);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleTabPress = (tab: string, path: string) => {
    setActiveMainTab(tab);
    router.push(path as any);
  };

  const TabButton = ({ id, label }: { id: "all" | "active" | "returned", label: string }) => (
    <TouchableOpacity
      onPress={() => setActiveTab(id)}
      style={[
        styles.tabButton,
        activeTab === id ? styles.tabButtonActive : styles.tabButtonInactive
      ]}
    >
      {id === "all" && <Icon name="list" size={16} color={activeTab === id ? Theme.colors.white : Theme.colors.textLight} style={styles.tabIcon} />}
      {id === "active" && <Icon name="clock" size={16} color={activeTab === id ? Theme.colors.white : Theme.colors.textLight} style={styles.tabIcon} />}
      {id === "returned" && <Icon name="check-circle" size={16} color={activeTab === id ? Theme.colors.white : Theme.colors.textLight} style={styles.tabIcon} />}
      <Text style={activeTab === id ? styles.tabButtonTextActive : styles.tabButtonText}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  const StatusBadge = ({ tx }: { tx: TransactionRecord }) => {
    if (!tx.returned_at) {
      return (
        <View style={styles.statusBadgeActive}>
          <Icon name="clock" size={12} color={Theme.colors.warning} />
          <Text style={styles.statusBadgeTextActive}>ACTIVE</Text>
        </View>
      );
    }

    return (
      <View style={styles.statusBadgeReturned}>
        <Icon name="check-circle" size={12} color={Theme.colors.success} />
        <Text style={styles.statusBadgeTextReturned}>RETURNED</Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + Theme.spacing.lg }]}>
        <Text style={styles.title}>Transactions</Text>
        <Text style={styles.subtitle}>Track all library borrowings and returns</Text>
      </View>

      {/* Tabs */}
      <View style={styles.tabContainer}>
        <TabButton id="all" label="All" />
        <TabButton id="active" label="Active" />
        <TabButton id="returned" label="Returned" />
      </View>

      {/* Statistics */}
      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <Icon name="list" size={24} color={Theme.colors.teal} />
          <Text style={styles.statNumber}>{records.length}</Text>
          <Text style={styles.statLabel}>Total</Text>
        </View>
        <View style={styles.statItem}>
          <Icon name="clock" size={24} color={Theme.colors.warning} />
          <Text style={styles.statNumber}>
            {records.filter(r => !r.returned_at).length}
          </Text>
          <Text style={styles.statLabel}>Active</Text>
        </View>
        <View style={styles.statItem}>
          <Icon name="check-circle" size={24} color={Theme.colors.success} />
          <Text style={styles.statNumber}>
            {records.filter(r => r.returned_at).length}
          </Text>
          <Text style={styles.statLabel}>Returned</Text>
        </View>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Theme.colors.navy} />
          <Text style={styles.loadingText}>Loading transactions...</Text>
        </View>
      ) : (
        <ScrollView 
          style={styles.scrollView}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[Theme.colors.navy]}
              tintColor={Theme.colors.navy}
            />
          }
          contentContainerStyle={styles.scrollContent}
        >
          {records.length === 0 ? (
            <View style={styles.emptyState}>
              <Icon name="inbox" size={64} color={Theme.colors.textLight} />
              <Text style={styles.emptyStateTitle}>No Transactions</Text>
              <Text style={styles.emptyStateText}>
                {activeTab === "all" 
                  ? "No transactions found in the system."
                  : activeTab === "active"
                  ? "No active borrowings at the moment."
                  : "No returned books found."}
              </Text>
            </View>
          ) : (
            records.map((tx) => (
              <View key={tx.tx_id} style={styles.card}>
                {/* Row: Status + Title */}
                <View style={styles.cardHeader}>
                  <StatusBadge tx={tx} />
                  <Text style={styles.cardTitle} numberOfLines={2}>
                    {tx.book_title || "Unknown Book"}
                  </Text>
                </View>

                {/* User Info */}
                <View style={styles.cardRow}>
                  <Icon name="user" size={14} color={Theme.colors.textLight} />
                  <Text style={styles.cardText}>
                    User: {tx.user_name || "Unknown User"}
                  </Text>
                </View>

                {/* Borrow Date */}
                <View style={styles.cardRow}>
                  <Icon name="calendar" size={14} color={Theme.colors.textLight} />
                  <Text style={styles.cardText}>
                    Borrowed: {tx.borrowed_at}
                  </Text>
                </View>

                {/* Return Date (if returned) */}
                {tx.returned_at && (
                  <View style={styles.cardRow}>
                    <Icon name="check-circle" size={14} color={Theme.colors.success} />
                    <Text style={[styles.cardText, styles.returnedText]}>
                      Returned: {tx.returned_at}
                    </Text>
                  </View>
                )}

                {/* Transaction ID */}
                <View style={styles.transactionId}>
                  <Icon name="hash" size={12} color={Theme.colors.textLight} />
                  <Text style={styles.transactionIdText}>ID: {tx.tx_id}</Text>
                </View>
              </View>
            ))
          )}
        </ScrollView>
      )}

      {/* Bottom Tab Bar */}
      <View style={[styles.tabBarContainer, { paddingBottom: insets.bottom }]}>
        <View style={styles.tabBar}>
          <TouchableOpacity 
            style={styles.tabItem}
            onPress={() => handleTabPress("dashboard", "/home")}
          >
            <Ionicons 
              name="home" 
              size={24} 
              color={activeMainTab === "dashboard" ? Theme.colors.gold : Theme.colors.textLight} 
            />
            <Text style={[
              styles.tabLabel,
              activeMainTab === "dashboard" && styles.tabLabelActive
            ]}>Home</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.tabItem}
            onPress={() => handleTabPress("books", "/books/list")}
          >
            <Ionicons 
              name="book" 
              size={24} 
              color={activeMainTab === "books" ? Theme.colors.gold : Theme.colors.textLight} 
            />
            <Text style={[
              styles.tabLabel,
              activeMainTab === "books" && styles.tabLabelActive
            ]}>Books</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.tabItem}
            onPress={() => handleTabPress("users", "/users/list")}
          >
            <Ionicons 
              name="people" 
              size={24} 
              color={activeMainTab === "users" ? Theme.colors.gold : Theme.colors.textLight} 
            />
            <Text style={[
              styles.tabLabel,
              activeMainTab === "users" && styles.tabLabelActive
            ]}>Users</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.tabItem}
            onPress={() => handleTabPress("transactions", "/transactions")}
          >
            <MaterialCommunityIcons 
              name="swap-horizontal" 
              size={24} 
              color={activeMainTab === "transactions" ? Theme.colors.gold : Theme.colors.textLight} 
            />
            <Text style={[
              styles.tabLabel,
              activeMainTab === "transactions" && styles.tabLabelActive
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
                color={activeMainTab === "admin" ? Theme.colors.gold : Theme.colors.textLight} 
              />
              <Text style={[
                styles.tabLabel,
                activeMainTab === "admin" && styles.tabLabelActive
              ]}>Admin</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Theme.colors.cream,
  },
  header: {
    paddingHorizontal: Theme.spacing.lg,
    paddingBottom: Theme.spacing.md,
    backgroundColor: Theme.colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.border,
  },
  title: {
    ...Theme.typography.h1,
    color: Theme.colors.navy,
    marginBottom: Theme.spacing.xs,
  },
  subtitle: {
    ...Theme.typography.caption,
    color: Theme.colors.textLight,
  },
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: Theme.spacing.lg,
    paddingVertical: Theme.spacing.md,
    backgroundColor: Theme.colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.border,
  },
  tabButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Theme.spacing.sm,
    paddingHorizontal: Theme.spacing.lg,
    borderRadius: Theme.radius.lg,
    marginRight: Theme.spacing.md,
  },
  tabButtonActive: {
    backgroundColor: Theme.colors.navy,
  },
  tabButtonInactive: {
    backgroundColor: 'rgba(0, 49, 83, 0.08)',
  },
  tabIcon: {
    marginRight: Theme.spacing.xs,
  },
  tabButtonText: {
    ...Theme.typography.caption,
    color: Theme.colors.textLight,
    fontWeight: '600',
  },
  tabButtonTextActive: {
    ...Theme.typography.caption,
    color: Theme.colors.white,
    fontWeight: '600',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: Theme.spacing.lg,
    backgroundColor: Theme.colors.white,
    marginHorizontal: Theme.spacing.lg,
    marginTop: Theme.spacing.lg,
    borderRadius: Theme.radius.md,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    shadowColor: Theme.colors.navy,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statNumber: {
    ...Theme.typography.h2,
    color: Theme.colors.navy,
    marginTop: Theme.spacing.xs,
  },
  statLabel: {
    ...Theme.typography.caption,
    color: Theme.colors.textLight,
    marginTop: Theme.spacing.xs,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: Theme.spacing.xl * 2,
  },
  loadingText: {
    ...Theme.typography.body,
    color: Theme.colors.textLight,
    marginTop: Theme.spacing.md,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: Theme.spacing.lg,
    paddingBottom: Theme.spacing.xl + 80, // Extra padding for tab bar
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Theme.spacing.xl * 2,
  },
  emptyStateTitle: {
    ...Theme.typography.h3,
    color: Theme.colors.textDark,
    marginTop: Theme.spacing.lg,
    marginBottom: Theme.spacing.sm,
  },
  emptyStateText: {
    ...Theme.typography.body,
    color: Theme.colors.textLight,
    textAlign: 'center',
    maxWidth: '80%',
  },
  card: {
    backgroundColor: Theme.colors.white,
    borderRadius: Theme.radius.md,
    padding: Theme.spacing.lg,
    marginBottom: Theme.spacing.md,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    shadowColor: Theme.colors.navy,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Theme.spacing.md,
  },
  cardTitle: {
    ...Theme.typography.h3,
    color: Theme.colors.textDark,
    flex: 1,
    marginLeft: Theme.spacing.md,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Theme.spacing.xs,
  },
  cardText: {
    ...Theme.typography.body,
    color: Theme.colors.textDark,
    marginLeft: Theme.spacing.sm,
  },
  returnedText: {
    color: Theme.colors.success,
  },
  transactionId: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Theme.spacing.md,
    paddingTop: Theme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Theme.colors.border,
  },
  transactionIdText: {
    ...Theme.typography.caption,
    color: Theme.colors.textLight,
    marginLeft: Theme.spacing.xs,
  },
  statusBadgeActive: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(243, 156, 18, 0.1)',
    paddingVertical: Theme.spacing.xs,
    paddingHorizontal: Theme.spacing.sm,
    borderRadius: Theme.radius.lg,
  },
  statusBadgeTextActive: {
    ...Theme.typography.caption,
    color: Theme.colors.warning,
    fontWeight: '600',
    marginLeft: Theme.spacing.xs,
  },
  statusBadgeReturned: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(39, 174, 96, 0.1)',
    paddingVertical: Theme.spacing.xs,
    paddingHorizontal: Theme.spacing.sm,
    borderRadius: Theme.radius.lg,
  },
  statusBadgeTextReturned: {
    ...Theme.typography.caption,
    color: Theme.colors.success,
    fontWeight: '600',
    marginLeft: Theme.spacing.xs,
  },
  // Bottom Tab Bar Styles
  tabBarContainer: {
    backgroundColor: Theme.colors.white,
    borderTopWidth: 1,
    borderTopColor: Theme.colors.border,
    shadowColor: Theme.colors.navy,
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 10,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: Theme.colors.white,
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabLabel: {
    fontSize: 12,
    color: Theme.colors.textLight,
    marginTop: 4,
    fontWeight: '500',
  },
  tabLabelActive: {
    color: Theme.colors.gold,
    fontWeight: '700',
  },
});