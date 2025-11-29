import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { getInventory, searchInventory } from "../../db/books";
import { useRouter } from "expo-router";

export default function InventoryScreen() {
  const router = useRouter();

  const [inventory, setInventory] = useState<any[]>([]);
  const [filtered, setFiltered] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [loading, setLoading] = useState(true);

  // -------------------------------------------
  // Load inventory
  // -------------------------------------------
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

  // -------------------------------------------
  // Badge color logic
  // -------------------------------------------
  const getStatusColor = (available: number) => {
    if (available <= 1) return "#dc2626"; // red
    if (available <= 3) return "#f59e0b"; // yellow
    return "#16a34a"; // green
  };

  // -------------------------------------------
  // Apply search + filters
  // -------------------------------------------
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
    <ScrollView style={{ flex: 1, padding: 20, backgroundColor: "#f8fafc" }}>
      <Text style={{ fontSize: 26, fontWeight: "800", marginBottom: 15 }}>
        Inventory
      </Text>

      {/* Search Bar */}
      <TextInput
        placeholder="Search title, author, category, or code..."
        value={search}
        onChangeText={setSearch}
        style={{
          backgroundColor: "white",
          padding: 12,
          borderRadius: 10,
          marginBottom: 12,
        }}
      />

      {/* Filters */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <TouchableOpacity
          onPress={() => setLowStockOnly(!lowStockOnly)}
          style={{
            backgroundColor: lowStockOnly ? "#b91c1c" : "#e2e8f0",
            padding: 10,
            borderRadius: 10,
            marginRight: 10,
          }}
        >
          <Text style={{ color: lowStockOnly ? "white" : "#1e293b" }}>
            Low Stock
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setCategoryFilter("all")}
          style={{
            backgroundColor: categoryFilter === "all" ? "#1e40af" : "#e2e8f0",
            padding: 10,
            borderRadius: 10,
            marginRight: 10,
          }}
        >
          <Text style={{ color: categoryFilter === "all" ? "white" : "#1e293b" }}>
            All Categories
          </Text>
        </TouchableOpacity>

        {categories.map((cat) => (
          <TouchableOpacity
            key={cat}
            onPress={() => setCategoryFilter(cat)}
            style={{
              backgroundColor: categoryFilter === cat ? "#1e40af" : "#e2e8f0",
              padding: 10,
              borderRadius: 10,
              marginRight: 10,
            }}
          >
            <Text
              style={{
                color: categoryFilter === cat ? "white" : "#1e293b",
              }}
            >
              {cat}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Inventory List */}
      {loading ? (
        <ActivityIndicator size="large" style={{ marginTop: 40 }} />
      ) : filtered.length === 0 ? (
        <Text style={{ marginTop: 30, textAlign: "center", color: "#64748b" }}>
          No books match filters.
        </Text>
      ) : (
        filtered.map((b) => {
          const available = b.total_copies - b.borrowed_now;

          return (
            <TouchableOpacity
              key={b.book_code}
              onPress={() => router.push(`/books/${b.book_code}`)}
              style={{
                backgroundColor: "white",
                padding: 16,
                borderRadius: 14,
                marginBottom: 14,
                elevation: 2,
              }}
            >
              <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                <Text style={{ fontWeight: "800", fontSize: 16 }}>{b.title}</Text>

                <Text
                  style={{
                    color: "white",
                    backgroundColor: getStatusColor(available),
                    paddingHorizontal: 10,
                    paddingVertical: 4,
                    borderRadius: 10,
                    fontWeight: "700",
                    fontSize: 12,
                  }}
                >
                  {available} available
                </Text>
              </View>

              <Text style={{ color: "#475569", marginTop: 4 }}>
                {b.author} — {b.category}
              </Text>

              <Text style={{ color: "#334155", marginTop: 6 }}>
                Total Copies: {b.total_copies} | Borrowed Now: {b.borrowed_now}
              </Text>
            </TouchableOpacity>
          );
        })
      )}
    </ScrollView>
  );
}
