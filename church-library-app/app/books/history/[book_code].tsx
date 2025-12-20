// church-library-app/app/books/history/[book_code].tsx

import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  StatusBar,
  StyleSheet,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { getBookHistory } from "../../../db/transactions";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

export default function BookHistoryScreen() {
  const { book_code } = useLocalSearchParams();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState<any[]>([]);

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    setLoading(true);
    const data = await getBookHistory(String(book_code));
    setHistory(data);
    setLoading(false);
  };

  const StatusBadge = ({ tx }: any) => {
    if (!tx.returned_at) {
      return (
        <View style={styles.activeBadge}>
          <View style={[styles.statusDot, { backgroundColor: "#E74C3C" }]} />
          <Text style={styles.activeBadgeText}>ACTIVE</Text>
        </View>
      );
    }
    return (
      <View style={styles.returnedBadge}>
        <View style={[styles.statusDot, { backgroundColor: "#27AE60" }]} />
        <Text style={styles.returnedBadgeText}>RETURNED</Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor="#FFFFFF" barStyle="dark-content" />
      
      {/* Header */}
      <SafeAreaView style={[styles.header, { paddingTop: insets.top }]} edges={['top']}>
        <View style={styles.headerContent}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButtonHeader}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="arrow-back" size={24} color="#003153" />
          </TouchableOpacity>
          
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle}>Borrow History</Text>
            <Text style={styles.headerSubtitle}>Book: {history[0]?.book_title || book_code}</Text>
          </View>
          
          {/* Empty view for spacing */}
          <View style={styles.spacer} />
        </View>
      </SafeAreaView>

      {/* Content */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#003153" />
          <Text style={styles.loadingText}>Loading history...</Text>
        </View>
      ) : (
        <ScrollView 
          style={styles.content}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.contentContainer}
        >
          {history.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No history found for this book.</Text>
            </View>
          ) : (
            history.map((tx) => (
              <View key={tx.tx_id} style={styles.historyCard}>
                {/* Row: Username + Status */}
                <View style={styles.cardHeader}>
                  <View style={styles.userInfo}>
                    <Text style={styles.userName}>{tx.user_name || "Unknown User"}</Text>
                    <Text style={styles.userId}>ID: {tx.fayda_id || "N/A"}</Text>
                  </View>
                  <StatusBadge tx={tx} />
                </View>

                <View style={styles.detailsContainer}>
                  <View style={styles.detailRow}>
                    <Ionicons name="calendar-outline" size={16} color="#7F8C8D" />
                    <Text style={styles.detailLabel}>Borrowed: </Text>
                    <Text style={styles.detailValue}>{tx.borrowed_at}</Text>
                  </View>

                  {tx.returned_at && (
                    <View style={styles.detailRow}>
                      <Ionicons name="checkmark-circle-outline" size={16} color="#27AE60" />
                      <Text style={styles.detailLabel}>Returned: </Text>
                      <Text style={[styles.detailValue, styles.returnedText]}>{tx.returned_at}</Text>
                    </View>
                  )}
                </View>

                {/* View User Profile Button */}
                <TouchableOpacity
                  onPress={() => router.push(`/users/${tx.fayda_id}`)}
                  style={styles.viewProfileButton}
                >
                  <Ionicons name="person-outline" size={18} color="#FFFFFF" />
                  <Text style={styles.viewProfileButtonText}>View User Profile</Text>
                </TouchableOpacity>
              </View>
            ))
          )}
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
    textAlign: "center",
  },
  spacer: {
    width: 40,
  },
  // Content
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 20,
    paddingTop: 20,
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
    minHeight: 300,
  },
  emptyText: {
    fontSize: 16,
    color: "#64748b",
    textAlign: "center",
  },
  // History Card
  historyCard: {
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
  userInfo: {
    flex: 1,
  },
  userName: {
    fontWeight: "700",
    fontSize: 18,
    color: "#003153",
    marginBottom: 4,
  },
  userId: {
    fontSize: 14,
    color: "#7F8C8D",
  },
  // Status Badges
  activeBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FDF2F2",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  activeBadgeText: {
    color: "#991b1b",
    fontWeight: "700",
    fontSize: 12,
  },
  returnedBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F0FFF4",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  returnedBadgeText: {
    color: "#065f46",
    fontWeight: "700",
    fontSize: 12,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  // Details
  detailsContainer: {
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
  returnedText: {
    color: "#065f46",
  },
  // Button
  viewProfileButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#005B82",
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
    shadowColor: "#005B82",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  viewProfileButtonText: {
    textAlign: "center",
    color: "white",
    fontWeight: "600",
    fontSize: 16,
  },
});