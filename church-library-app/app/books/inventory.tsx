// church-library-app/app/books/inventory.tsx
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StatusBar,
  StyleSheet,
} from "react-native";
import { getInventory, searchInventory } from "../../db/books";
import { useRouter } from "expo-router";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons, Feather } from "@expo/vector-icons";

export default function InventoryScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [inventory, setInventory] = useState<any[]>([]);
  const [filtered, setFiltered] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [loading, setLoading] = useState(true);

  // Load inventory
  const loadData = async () => {
    setLoading(true);
    const result = await getInventory();
    setInventory(result);
    setFiltered(result);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  // Badge color logic
  const getStatusColor = (available: number) => {
    if (available <= 1) return "#dc2626"; // red
    if (available <= 3) return "#f59e0b"; // yellow
    return "#16a34a"; // green
  };

  const getStatusBgColor = (available: number) => {
    if (available <= 1) return "#FDF2F2"; // red background
    if (available <= 3) return "#FEFCE8"; // yellow background
    return "#F0FFF4"; // green background
  };

  // Apply search + filters
  const applyFilters = () => {
    let data = [...inventory];

    // Search filter
    if (search.trim().length > 0) {
      data = data.filter((b) =>
        [b.title, b.author, b.category, b.book_code]
          .join(" ")
          .toLowerCase()
          .includes(search.toLowerCase())
      );
    }

    // Category filter
    if (categoryFilter !== "all") {
      data = data.filter((b) => b.category === categoryFilter);
    }

    // Low stock filter
    if (lowStockOnly) {
      data = data.filter((b) => b.total_copies - b.borrowed_now <= 1);
    }

    setFiltered(data);
  };

  useEffect(() => {
    applyFilters();
  }, [search, categoryFilter, lowStockOnly, inventory]);

  const categories = [...new Set(inventory.map((b) => b.category))];

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor="#FFFFFF" barStyle="dark-content" />
      
      {/* Header */}
      <SafeAreaView style={[styles.header, { paddingTop: insets.top }]} edges={['top']}>
        <View style={styles.headerContent}>
          <TouchableOpacity
            onPress={() => router.push('/home')}
            style={styles.backButtonHeader}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="arrow-back" size={24} color="#003153" />
          </TouchableOpacity>
          
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle}>Inventory</Text>
            <Text style={styles.headerSubtitle}>
              {loading ? "Loading..." : `${filtered.length} books`}
            </Text>
          </View>
          
          {/* Refresh Button */}
          <TouchableOpacity
            onPress={loadData}
            style={styles.refreshButton}
          >
            <Feather name="refresh-cw" size={20} color="#005B82" />
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      {/* Search and Filters */}
      <View style={styles.searchSection}>
        <View style={styles.searchContainer}>
          <Feather name="search" size={20} color="#7F8C8D" style={styles.searchIcon} />
          <TextInput
            placeholder="Search title, author, category, or code..."
            placeholderTextColor="#94a3b8"
            value={search}
            onChangeText={setSearch}
            style={styles.searchInput}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch("")} style={styles.clearButton}>
              <Feather name="x" size={18} color="#7F8C8D" />
            </TouchableOpacity>
          )}
        </View>

        {/* Filters */}
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          style={styles.filtersContainer}
          contentContainerStyle={styles.filtersContent}
        >
          <TouchableOpacity
            onPress={() => setLowStockOnly(!lowStockOnly)}
            style={[
              styles.filterChip,
              lowStockOnly ? styles.activeFilterChip : styles.inactiveFilterChip
            ]}
          >
            <Feather 
              name="alert-triangle" 
              size={14} 
              color={lowStockOnly ? "#FFFFFF" : "#dc2626"} 
            />
            <Text style={[
              styles.filterChipText,
              lowStockOnly ? styles.activeFilterChipText : styles.inactiveFilterChipText
            ]}>
              Low Stock
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setCategoryFilter("all")}
            style={[
              styles.filterChip,
              categoryFilter === "all" ? styles.activeFilterChip : styles.inactiveFilterChip
            ]}
          >
            <Feather 
              name="grid" 
              size={14} 
              color={categoryFilter === "all" ? "#FFFFFF" : "#003153"} 
            />
            <Text style={[
              styles.filterChipText,
              categoryFilter === "all" ? styles.activeFilterChipText : styles.inactiveFilterChipText
            ]}>
              All
            </Text>
          </TouchableOpacity>

          {categories.map((cat) => (
            <TouchableOpacity
              key={cat}
              onPress={() => setCategoryFilter(cat)}
              style={[
                styles.filterChip,
                categoryFilter === cat ? styles.activeFilterChip : styles.inactiveFilterChip
              ]}
            >
              <Feather 
                name="folder" 
                size={14} 
                color={categoryFilter === cat ? "#FFFFFF" : "#D4AF37"} 
              />
              <Text style={[
                styles.filterChipText,
                categoryFilter === cat ? styles.activeFilterChipText : styles.inactiveFilterChipText
              ]}>
                {cat}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Inventory List */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#003153" />
          <Text style={styles.loadingText}>Loading inventory...</Text>
        </View>
      ) : filtered.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Feather name="inbox" size={64} color="#E5E0D5" />
          <Text style={styles.emptyTitle}>No books found</Text>
          <Text style={styles.emptySubtitle}>
            {search || categoryFilter !== "all" || lowStockOnly 
              ? "Try adjusting your filters"
              : "Add books to get started"}
          </Text>
          {(search || categoryFilter !== "all" || lowStockOnly) && (
            <TouchableOpacity
              style={styles.resetButton}
              onPress={() => {
                setSearch("");
                setCategoryFilter("all");
                setLowStockOnly(false);
              }}
            >
              <Text style={styles.resetButtonText}>Reset Filters</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <ScrollView 
          style={styles.content}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.contentContainer}
        >
          {filtered.map((b) => {
            const available = b.total_copies - b.borrowed_now;
            const statusColor = getStatusColor(available);
            const statusBgColor = getStatusBgColor(available);

            return (
              <TouchableOpacity
                key={b.book_code}
                onPress={() => router.push(`/books/${b.book_code}`)}
                style={styles.bookCard}
              >
                <View style={styles.cardHeader}>
                  <View style={styles.bookInfo}>
                    <Text style={styles.bookTitle} numberOfLines={2}>{b.title}</Text>
                    <Text style={styles.bookAuthor} numberOfLines={1}>{b.author}</Text>
                  </View>
                  
                  <View style={[styles.availabilityBadge, { backgroundColor: statusBgColor }]}>
                    <View style={[styles.availabilityDot, { backgroundColor: statusColor }]} />
                    <Text style={[styles.availabilityText, { color: statusColor }]}>
                      {available} available
                    </Text>
                  </View>
                </View>

                <View style={styles.cardDetails}>
                  <View style={styles.detailRow}>
                    <Feather name="hash" size={14} color="#7F8C8D" />
                    <Text style={styles.detailLabel}>Code: </Text>
                    <Text style={styles.detailValue}>{b.book_code}</Text>
                  </View>
                  
                  <View style={styles.detailRow}>
                    <Feather name="folder" size={14} color="#7F8C8D" />
                    <Text style={styles.detailLabel}>Category: </Text>
                    <Text style={styles.detailValue}>{b.category}</Text>
                  </View>
                  
                  <View style={styles.detailRow}>
                    <Feather name="copy" size={14} color="#7F8C8D" />
                    <Text style={styles.detailLabel}>Copies: </Text>
                    <Text style={styles.detailValue}>
                      {b.borrowed_now} borrowed of {b.total_copies} total
                    </Text>
                  </View>
                </View>

                <View style={styles.cardFooter}>
                  <TouchableOpacity
                    style={styles.viewButton}
                    onPress={() => router.push(`/books/${b.book_code}`)}
                  >
                    <Text style={styles.viewButtonText}>View Details</Text>
                    <Feather name="chevron-right" size={16} color="#005B82" />
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FDFBF7",
  },
  // Header
  header: {
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E0D5",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  backButtonHeader: {
    padding: 8,
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#003153",
  },
  headerSubtitle: {
    fontSize: 14,
    color: "#7F8C8D",
    marginTop: 2,
  },
  refreshButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F0F7FF",
    justifyContent: "center",
    alignItems: "center",
  },
  // Search Section
  searchSection: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E0D5",
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 12,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: "#003153",
    padding: 0,
  },
  clearButton: {
    padding: 4,
  },
  // Filters
  filtersContainer: {
    marginBottom: 8,
  },
  filtersContent: {
    paddingRight: 20,
  },
  filterChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 10,
    gap: 6,
  },
  activeFilterChip: {
    backgroundColor: "#003153",
  },
  inactiveFilterChip: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E5E0D5",
  },
  filterChipText: {
    fontSize: 14,
    fontWeight: "600",
  },
  activeFilterChipText: {
    color: "#FFFFFF",
  },
  inactiveFilterChipText: {
    color: "#003153",
  },
  // Content
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: "#003153",
    fontWeight: "500",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
    minHeight: 400,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#003153",
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    color: "#7F8C8D",
    textAlign: "center",
    marginBottom: 24,
  },
  resetButton: {
    backgroundColor: "#005B82",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  resetButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  // Book Card
  bookCard: {
    backgroundColor: "white",
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#E5E0D5",
    shadowColor: "#003153",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  bookInfo: {
    flex: 1,
    marginRight: 12,
  },
  bookTitle: {
    fontWeight: "800",
    fontSize: 18,
    color: "#003153",
    marginBottom: 4,
    lineHeight: 24,
  },
  bookAuthor: {
    fontSize: 14,
    color: "#005B82",
    fontWeight: "500",
  },
  availabilityBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  availabilityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  availabilityText: {
    fontSize: 12,
    fontWeight: "700",
  },
  // Card Details
  cardDetails: {
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  detailLabel: {
    fontSize: 14,
    color: "#7F8C8D",
    marginLeft: 8,
    marginRight: 4,
  },
  detailValue: {
    fontSize: 14,
    color: "#003153",
    fontWeight: "500",
  },
  // Card Footer
  cardFooter: {
    borderTopWidth: 1,
    borderTopColor: "#F0F7FF",
    paddingTop: 16,
  },
  viewButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  viewButtonText: {
    fontSize: 16,
    color: "#005B82",
    fontWeight: "600",
  },
});