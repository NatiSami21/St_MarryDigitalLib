import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  Image,
  RefreshControl,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Feather';
import Ionicons from 'react-native-vector-icons/Ionicons';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

import { getAllUsers, searchUsers } from "../../db/users";
import { Theme } from "../../styles/theme";
import { getSession } from "../../lib/session";
import { events } from "../../utils/events";

interface User {
  fayda_id: string;
  name: string;
  phone: string;
  gender?: string;
  address?: string;
  photo_uri?: string;
}

export default function UserListScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [search, setSearch] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [activeMainTab, setActiveMainTab] = useState("users");

  const loadUsers = async () => {
    setLoading(true);
    const list = await getAllUsers() as User[];
    setUsers(list);
    setFilteredUsers(list);
    setLoading(false);
  };

  const handleSearch = async (text: string) => {
    setSearch(text);
    if (text.trim().length === 0) {
      setFilteredUsers(users);
    } else {
      const results = await searchUsers(text.trim()) as User[];
      setFilteredUsers(results);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadUsers();
    setRefreshing(false);
  }, []);

  const checkUserRole = async () => {
    const session = await getSession();
    if (session?.role === "admin") {
      setIsAdmin(true);
    }
  };

  const handleTabPress = (tab: string, path: string) => {
    setActiveMainTab(tab);
    router.push(path as any);
  };

  useEffect(() => {
    loadUsers();
    checkUserRole();
  }, []);

  useEffect(() => {
    const sub = events.listen("refresh-users", loadUsers);
    return () => sub.remove();
  }, []);

  const renderItem = ({ item }: { item: User }) => (
    <TouchableOpacity
      onPress={() => router.push(`/users/${item.fayda_id}`)}
      style={styles.userCard}
      activeOpacity={0.7}
    >
      <View style={styles.userCardContent}>
        <Image
          source={
            item.photo_uri
              ? { uri: item.photo_uri }
              : require("../../assets/user-placeholder.png")
          }
          style={styles.userImage}
        />

        <View style={styles.userInfo}>
          <Text style={styles.userName} numberOfLines={1}>
            {item.name}
          </Text>
          <View style={styles.userDetails}>
            <View style={styles.detailRow}>
              <Icon name="hash" size={12} color={Theme.colors.textLight} />
              <Text style={styles.userDetailText}>{item.fayda_id}</Text>
            </View>
            {item.phone && (
              <View style={styles.detailRow}>
                <Icon name="phone" size={12} color={Theme.colors.textLight} />
                <Text style={styles.userDetailText}>{item.phone}</Text>
              </View>
            )}
            {item.gender && (
              <View style={styles.detailRow}>
                <Icon name="users" size={12} color={Theme.colors.textLight} />
                <Text style={styles.userDetailText}>{item.gender}</Text>
              </View>
            )}
          </View>
        </View>

        <Icon name="chevron-right" size={20} color={Theme.colors.textLight} />
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + Theme.spacing.lg }]}>
        <Text style={styles.title}>Users</Text>
        <Text style={styles.subtitle}>Manage library users and members</Text>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Icon name="search" size={20} color={Theme.colors.textLight} style={styles.searchIcon} />
          <TextInput
            value={search}
            onChangeText={handleSearch}
            placeholder="Search by name, ID, or phone..."
            style={styles.searchInput}
            placeholderTextColor={Theme.colors.textLight}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => handleSearch("")}>
              <Icon name="x" size={20} color={Theme.colors.textLight} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* User Stats */}
      {/*
       
      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <Icon name="users" size={24} color={Theme.colors.teal} />
          <Text style={styles.statNumber}>{users.length}</Text>
          <Text style={styles.statLabel}>Total Users</Text>
        </View>
        <View style={styles.statItem}>
          <Icon name="user-check" size={24} color={Theme.colors.success} />
          <Text style={styles.statNumber}>
            {users.filter(u => u.phone).length}
          </Text>
          <Text style={styles.statLabel}>With Phone</Text>
        </View>
        <View style={styles.statItem}>
          <Icon name="user-plus" size={24} color={Theme.colors.gold} />
          <Text style={styles.statNumber}>
            {users.filter(u => u.gender).length}
          </Text>
          <Text style={styles.statLabel}>Gender Recorded</Text>
        </View>
      </View>
      
       */}

      {/* User List */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Theme.colors.navy} />
          <Text style={styles.loadingText}>Loading users...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredUsers}
          keyExtractor={(item) => item.fayda_id}
          renderItem={renderItem}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[Theme.colors.navy]}
              tintColor={Theme.colors.navy}
            />
          }
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Icon name="users" size={64} color={Theme.colors.textLight} />
              <Text style={styles.emptyStateTitle}>No Users Found</Text>
              <Text style={styles.emptyStateText}>
                {search.length > 0
                  ? "No users match your search criteria."
                  : "No users registered yet. Tap the + button to add a new user."}
              </Text>
            </View>
          }
        />
      )}

      {/* Add User Button */}
      <TouchableOpacity
        onPress={() => router.push("/users/register")}
        style={styles.addButton}
        activeOpacity={0.8}
      >
        <Icon name="user-plus" size={24} color={Theme.colors.white} />
      </TouchableOpacity>

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
  searchContainer: {
    paddingHorizontal: Theme.spacing.lg,
    paddingVertical: Theme.spacing.md,
    backgroundColor: Theme.colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.border,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 49, 83, 0.05)',
    borderRadius: Theme.radius.lg,
    paddingHorizontal: Theme.spacing.md,
    paddingVertical: Theme.spacing.sm,
  },
  searchIcon: {
    marginRight: Theme.spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: Theme.colors.textDark,
    paddingVertical: Theme.spacing.xs,
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
    textAlign: 'center',
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
  listContent: {
    padding: Theme.spacing.lg,
    paddingBottom: Theme.spacing.xl + 120,
  },
  userCard: {
    backgroundColor: Theme.colors.white,
    borderRadius: Theme.radius.md,
    marginBottom: Theme.spacing.md,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    shadowColor: Theme.colors.navy,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  userCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Theme.spacing.lg,
  },
  userImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 2,
    borderColor: Theme.colors.border,
    marginRight: Theme.spacing.md,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    ...Theme.typography.h3,
    color: Theme.colors.textDark,
    marginBottom: Theme.spacing.sm,
  },
  userDetails: {
    gap: Theme.spacing.xs,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  userDetailText: {
    ...Theme.typography.caption,
    color: Theme.colors.textLight,
    marginLeft: Theme.spacing.xs,
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
  addButton: {
    position: 'absolute',
    bottom: 100,
    right: Theme.spacing.lg,
    backgroundColor: Theme.colors.navy,
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: Theme.colors.navy,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
    zIndex: 10,
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