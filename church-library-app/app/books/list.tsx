// church-library-app/app/books/list.tsx

import React, { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  FlatList,
  RefreshControl,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  ActivityIndicator,
  Dimensions,
  Modal,
  Alert,
  Platform,
  ScrollView,
  Animated,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons, Feather, MaterialIcons, MaterialCommunityIcons } from "@expo/vector-icons";
import { SafeAreaView, SafeAreaProvider, useSafeAreaInsets } from "react-native-safe-area-context";
import BookCard from "../../components/BookCard";
import { Book } from "../../types/Book";
import { getAllBooks, searchBooks } from "../../db/books";
import { events } from "../../utils/events";
import { getSession, clearSession } from "../../lib/session";
import { getLibrarianByUsername } from "../../db/queries/librarians";
import { syncAll, getSyncStatus } from "../../lib/syncEngine";

const { width, height } = Dimensions.get("window");
const DRAWER_WIDTH = width * 0.75;

interface Librarian {
  id: number;
  username: string;
  role: string;
  name?: string;
  full_name?: string;
}

interface FilterOptions {
  category: string;
  sortBy: "title" | "author" | "code" | "category";
  sortOrder: "asc" | "desc";
}

// Main BookList Component
function BookListContent() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [books, setBooks] = useState<Book[]>([]);
  const [filteredBooks, setFilteredBooks] = useState<Book[]>([]);
  const [search, setSearch] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<FilterOptions>({
    category: "all",
    sortBy: "title",
    sortOrder: "asc",
  });

  // Drawer and user state
  const [isAdmin, setIsAdmin] = useState(false);
  const [userDisplayName, setUserDisplayName] = useState("");
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [activeTab, setActiveTab] = useState("books");
  
  // Animation values
  const drawerAnimation = useRef(new Animated.Value(-DRAWER_WIDTH)).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;

  // Sync status
  const [syncStatus, setSyncStatus] = useState({
    pending: 0,
    lastPush: null as string | null,
    lastPull: null as string | null,
  });
  const [syncLoading, setSyncLoading] = useState(false);

  const searchInputRef = useRef<TextInput>(null);

  // Load user and sync status
  const loadUserAndSync = async () => {
    try {
      const session = await getSession();
      if (session) {
        const user = await getLibrarianByUsername(session.username);
        if (user) {
          const displayName = (user as Librarian).name || 
                             (user as Librarian).full_name || 
                             user.username;
          setUserDisplayName(displayName);
          setIsAdmin(user.role === "admin");
        }
      }

      const s = await getSyncStatus();
      setSyncStatus(s);
    } catch (err) {
      console.log("Load user/sync error:", err);
    }
  };

  // Load books from DB
  const loadBooks = async () => {
    setLoading(true);
    try {
      const result = await getAllBooks();
      setBooks(result as Book[]);
      setFilteredBooks(result as Book[]);
    } catch (err) {
      console.log("Load books error:", err);
      Alert.alert("Error", "Failed to load books");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Initial load
  useEffect(() => {
    loadBooks();
    loadUserAndSync();
  }, []);

  // Listen for refresh events
  useEffect(() => {
    const sub = events.listen("refresh-books", loadBooks);
    return () => sub.remove();
  }, []);

  // Handle search
  const handleSearch = async (text: string) => {
    setSearch(text);

    if (text.trim().length === 0) {
      setFilteredBooks(books);
      return;
    }

    try {
      const result = await searchBooks(text);
      setFilteredBooks(result as Book[]);
    } catch (err) {
      console.log("Search error:", err);
    }
  };

  // Apply filters
  const applyFilters = () => {
    let result = [...books];

    // Apply search filter
    if (search.trim()) {
      const query = search.toLowerCase().trim();
      result = result.filter(book =>
        book.title?.toLowerCase().includes(query) ||
        book.author?.toLowerCase().includes(query) ||
        book.book_code?.toLowerCase().includes(query) ||
        book.category?.toLowerCase().includes(query)
      );
    }

    // Apply category filter
    if (filters.category !== "all") {
      result = result.filter(book => book.category === filters.category);
    }

    // Apply sorting
    result.sort((a, b) => {
      let aValue = "";
      let bValue = "";
      
      switch (filters.sortBy) {
        case "title":
          aValue = a.title || "";
          bValue = b.title || "";
          break;
        case "author":
          aValue = a.author || "";
          bValue = b.author || "";
          break;
        case "code":
          aValue = a.book_code || "";
          bValue = b.book_code || "";
          break;
        case "category":
          aValue = a.category || "";
          bValue = b.category || "";
          break;
      }

      if (filters.sortOrder === "asc") {
        return aValue.localeCompare(bValue);
      } else {
        return bValue.localeCompare(aValue);
      }
    });

    setFilteredBooks(result);
  };

  useEffect(() => {
    applyFilters();
  }, [search, filters, books]);

  // Drawer animation
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

  const handleRefresh = () => {
    setRefreshing(true);
    loadBooks();
  };

  const handleSync = async () => {
    setSyncLoading(true);
    try {
      const result = await syncAll();
      if (result.success) {
        Alert.alert("Sync Complete", "All data has been synchronized with the cloud.");
      } else {
        Alert.alert("Sync Failed", "Please check your internet connection.");
      }
    } catch (err) {
      Alert.alert("Sync Error", "An unexpected error occurred.");
    } finally {
      setSyncLoading(false);
      loadUserAndSync();
    }
  };

  const getUniqueCategories = () => {
    const categories = books.map(book => book.category).filter(Boolean) as string[];
    return Array.from(new Set(categories));
  };

  const handleTabPress = (tab: string, path: string) => {
    setActiveTab(tab);
    router.push(path as any);
    setDrawerVisible(false);
  };

  const handleLogout = async () => {
    Alert.alert(
      "Logout Confirmation",
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
  };

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

  const FilterModal = () => (
    <Modal
      visible={showFilters}
      transparent
      animationType="slide"
      onRequestClose={() => setShowFilters(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.filterModal, { paddingBottom: insets.bottom }]}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Filter & Sort</Text>
            <TouchableOpacity
              onPress={() => setShowFilters(false)}
              style={styles.closeButton}
            >
              <Feather name="x" size={24} color="#003153" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.filterContent}>
            {getUniqueCategories().length > 0 && (
              <View style={styles.filterSection}>
                <Text style={styles.sectionTitle}>Category</Text>
                <View style={styles.filterOptions}>
                  <TouchableOpacity
                    style={[
                      styles.filterChip,
                      filters.category === "all" && styles.filterChipActive
                    ]}
                    onPress={() => setFilters(prev => ({ ...prev, category: "all" }))}
                  >
                    <Text style={[
                      styles.filterChipText,
                      filters.category === "all" && styles.filterChipTextActive
                    ]}>
                      All Categories
                    </Text>
                  </TouchableOpacity>
                  {getUniqueCategories().map(category => (
                    <TouchableOpacity
                      key={category}
                      style={[
                        styles.filterChip,
                        filters.category === category && styles.filterChipActive
                      ]}
                      onPress={() => setFilters(prev => ({ ...prev, category }))}
                    >
                      <Text style={[
                        styles.filterChipText,
                        filters.category === category && styles.filterChipTextActive
                      ]}>
                        {category}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            <View style={styles.filterSection}>
              <Text style={styles.sectionTitle}>Sort By</Text>
              <View style={styles.sortOptions}>
                {["title", "author", "code", "category"].map(sortBy => (
                  <TouchableOpacity
                    key={sortBy}
                    style={[
                      styles.sortOption,
                      filters.sortBy === sortBy && styles.sortOptionActive
                    ]}
                    onPress={() => setFilters(prev => ({ ...prev, sortBy: sortBy as any }))}
                  >
                    <Text style={[
                      styles.sortOptionText,
                      filters.sortBy === sortBy && styles.sortOptionTextActive
                    ]}>
                      {sortBy.charAt(0).toUpperCase() + sortBy.slice(1)}
                    </Text>
                    {filters.sortBy === sortBy && (
                      <TouchableOpacity
                        onPress={() => setFilters(prev => ({
                          ...prev,
                          sortOrder: prev.sortOrder === "asc" ? "desc" : "asc"
                        }))}
                        style={styles.sortOrderButton}
                      >
                        <Feather
                          name={filters.sortOrder === "asc" ? "arrow-up" : "arrow-down"}
                          size={16}
                          color="#D4AF37"
                        />
                      </TouchableOpacity>
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </ScrollView>

          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={styles.resetButton}
              onPress={() => {
                setFilters({
                  category: "all",
                  sortBy: "title",
                  sortOrder: "asc",
                });
              }}
            >
              <Feather name="refresh-cw" size={18} color="#E74C3C" />
              <Text style={styles.resetButtonText}>Reset</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.applyButton}
              onPress={() => setShowFilters(false)}
            >
              <Text style={styles.applyButtonText}>Apply Filters</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#003153" />
        <Text style={styles.loadingText}>Loading books...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor="#FFFFFF" barStyle="dark-content" />
      
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
          <Text style={styles.drawerSectionTitle}>MAIN NAVIGATION</Text>
          <NavItem icon="home" label="Dashboard" path="/home" tab="dashboard" />
          <NavItem icon="book" label="Books" path="/books/list" tab="books" />
          <NavItem icon="people" label="Users" path="/users/list" tab="users" />
          <NavItem icon="swap-horizontal" label="Transactions" path="/transactions" tab="transactions" />
          <NavItem icon="stats-chart" label="Reports" path="/reports" tab="reports" />
          <NavItem icon="calendar" label="Shifts" path="/librarian/shifts" tab="myshifts" />

          {isAdmin && (
            <>
              <Text style={styles.drawerSectionTitle}>ADMINISTRATION</Text>
              <NavItem icon="shield-checkmark" label="Admin Panel" path="/admin" tab="admin" />
              <NavItem icon="person-add" label="Manage Librarians" path="/admin/librarians" tab="librarians" />
              <NavItem icon="time" label="Shift Management" path="/admin/shifts" tab="shifts" />
              <NavItem icon="sync" label="Sync Control" path="/admin/sync" tab="sync" />
            </>
          )}
          
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
            <Text style={styles.topNavTitle}>BOOK List</Text>
          </View>
          
          <TouchableOpacity
            style={styles.userBadge}
            onPress={() => setDrawerVisible(true)}
          >
            <Ionicons name="person-circle" size={32} color="#003153" />
          </TouchableOpacity>
        </View>

        {/* Book List Content */}
        <View style={styles.content}>
          {/* Search Bar */}
          <View style={styles.searchContainer}>
            <View style={styles.searchInputContainer}>
              <Feather name="search" size={20} color="#7F8C8D" style={styles.searchIcon} />
              <TextInput
                ref={searchInputRef}
                style={styles.searchInput}
                placeholder="Search books by title, author, code..."
                placeholderTextColor="#A0AEC0"
                value={search}
                onChangeText={handleSearch}
                returnKeyType="search"
              />
              {search.length > 0 && (
                <TouchableOpacity
                  onPress={() => handleSearch("")}
                  style={styles.clearButton}
                >
                  <Feather name="x" size={18} color="#7F8C8D" />
                </TouchableOpacity>
              )}
            </View>
            
            <TouchableOpacity
              style={styles.filterButton}
              onPress={() => setShowFilters(true)}
            >
              <Feather name="filter" size={20} color="#FFFFFF" />
              {filters.category !== "all" && (
                <View style={styles.filterBadge}>
                  <Feather name="check" size={10} color="#FFFFFF" />
                </View>
              )}
            </TouchableOpacity>
          </View>

          {/* Book List */}
          {filteredBooks.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Feather name="book-open" size={64} color="#E5E0D5" />
              <Text style={styles.emptyTitle}>
                {search ? "No matching books found" : "No books available"}
              </Text>
              <Text style={styles.emptySubtitle}>
                {search
                  ? "Try different search terms"
                  : "Add books to get started"}
              </Text>
              {search ? (
                <TouchableOpacity
                  style={styles.emptyButton}
                  onPress={() => handleSearch("")}
                >
                  <Text style={styles.emptyButtonText}>Clear Search</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={styles.emptyButton}
                  onPress={() => router.push("/books/register")}
                >
                  <Feather name="plus" size={18} color="#FFFFFF" />
                  <Text style={styles.emptyButtonText}>Add First Book</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            <FlatList
              data={filteredBooks}
              renderItem={({ item }) => (
                <BookCard 
                  book={item} 
                  onPress={() => router.push(`/books/${item.book_code}`)}
                />
              )}
              keyExtractor={(item) => item.book_code}
              refreshControl={
                <RefreshControl 
                  refreshing={refreshing} 
                  onRefresh={handleRefresh}
                  colors={["#003153"]}
                  tintColor="#003153"
                />
              }
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.listContent}
              ListHeaderComponent={
                <View style={styles.listHeader}>
                  <Text style={styles.listHeaderText}>
                    Showing {filteredBooks.length} book{filteredBooks.length !== 1 ? 's' : ''}
                    {search && ` for "${search}"`}
                  </Text>
                </View>
              }
            />
          )}
        </View>

        {/* Bottom Tab Bar */}
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

        {/* Floating Action Buttons */}
        <TouchableOpacity
          style={[styles.fab, { bottom: insets.bottom + 80 }]}
          onPress={() => router.push("/books/scan")}
        >
          <Feather name="camera" size={24} color="#FFFFFF" />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.fabAdd, { bottom: insets.bottom + 150 }]}
          onPress={() => router.push("/books/register")}
        >
          <Feather name="plus" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </SafeAreaView>

      {/* Filter Modal */}
      <FilterModal />
    </View>
  );
}

// Main Export Component
export default function BookListScreen() {
  return (
    <SafeAreaProvider>
      <BookListContent />
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
  
  // Drawer Styles (same as home screen)
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
  
  // Main Content
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
  
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  
  // Search Bar
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
    gap: 12,
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E0D5",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    shadowColor: "#003153",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: "#003153",
    padding: 0,
    paddingVertical: Platform.OS === 'ios' ? 0 : 4,
  },
  clearButton: {
    padding: 4,
  },
  filterButton: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: "#005B82",
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
    shadowColor: "#005B82",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  filterBadge: {
    position: "absolute",
    top: -4,
    right: -4,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: "#D4AF37",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  
  // Empty State
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#003153",
    marginTop: 24,
    marginBottom: 8,
    textAlign: "center",
  },
  emptySubtitle: {
    fontSize: 16,
    color: "#7F8C8D",
    marginBottom: 32,
    textAlign: "center",
    lineHeight: 24,
  },
  emptyButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#003153",
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
    shadowColor: "#003153",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  emptyButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  
  // List Content
  listContent: {
    paddingBottom: 100,
  },
  listHeader: {
    marginBottom: 16,
  },
  listHeaderText: {
    fontSize: 14,
    color: "#7F8C8D",
    fontWeight: "500",
  },
  
  // Tab Bar (same as home screen)
  tabBarContainer: {
    backgroundColor: "#FFFFFF",
  },
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
  
  // Floating Action Buttons
  fab: {
    position: "absolute",
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#005B82",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#005B82",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 10,
    zIndex: 100,
  },
  fabAdd: {
    position: "absolute",
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#D4AF37",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#D4AF37",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 10,
    zIndex: 100,
  },
  
  // Filter Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  filterModal: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: height * 0.8,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E0D5",
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#003153",
  },
  closeButton: {
    padding: 8,
  },
  filterContent: {
    padding: 24,
  },
  filterSection: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#003153",
    marginBottom: 16,
  },
  filterOptions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  filterChip: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: "#F0F7FF",
    borderWidth: 1,
    borderColor: "transparent",
  },
  filterChipActive: {
    backgroundColor: "#003153",
    borderColor: "#003153",
  },
  filterChipText: {
    fontSize: 14,
    color: "#003153",
    fontWeight: "500",
  },
  filterChipTextActive: {
    color: "#FFFFFF",
  },
  sortOptions: {
    gap: 12,
  },
  sortOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "transparent",
  },
  sortOptionActive: {
    backgroundColor: "#F0F7FF",
    borderColor: "#D4AF37",
  },
  sortOptionText: {
    fontSize: 16,
    color: "#003153",
    fontWeight: "500",
  },
  sortOptionTextActive: {
    color: "#003153",
    fontWeight: "600",
  },
  sortOrderButton: {
    padding: 4,
  },
  modalFooter: {
    flexDirection: "row",
    padding: 24,
    borderTopWidth: 1,
    borderTopColor: "#E5E0D5",
    gap: 12,
  },
  resetButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: "#FDF2F2",
    gap: 8,
  },
  resetButtonText: {
    fontSize: 16,
    color: "#E74C3C",
    fontWeight: "600",
  },
  applyButton: {
    flex: 2,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: "#003153",
  },
  applyButtonText: {
    fontSize: 16,
    color: "#FFFFFF",
    fontWeight: "600",
  },
});