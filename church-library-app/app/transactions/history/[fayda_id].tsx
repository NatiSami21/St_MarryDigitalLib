// church-library-app/app/transactions/history/[fayda_id].tsx

import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  StyleSheet,
  Image,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import Icon from 'react-native-vector-icons/Feather';

import { getUser } from "../../../db/users";
import { getUserHistory } from "../../../db/transactions";
import { Theme } from "../../../styles/theme";

// Define TypeScript interfaces
interface TransactionRecord {
  tx_id: string;
  book_title: string;
  book_code: string;
  borrowed_at: string;
  returned_at: string | null;
  // Add other properties from your database schema as needed
  user_name?: string;
  fayda_id?: string;
}

interface User {
  fayda_id: string;
  name: string;
  photo_uri?: string;
  gender?: string;
  phone?: string;
  address?: string;
}

interface StatusBadgeProps {
  tx: TransactionRecord;
}

export default function UserHistoryScreen() {
  const { fayda_id } = useLocalSearchParams();
  const router = useRouter();

  const [user, setUser] = useState<User | null>(null);
  const [records, setRecords] = useState<TransactionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCount, setActiveCount] = useState(0);
  const [returnedCount, setReturnedCount] = useState(0);

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    setLoading(true);

    const u = await getUser(String(fayda_id));
    const tx = await getUserHistory(String(fayda_id));
    
    // Type assertion for transaction records
    const typedTx: TransactionRecord[] = tx as TransactionRecord[];
    
    // Calculate counts with proper typing
    const active = typedTx.filter((r: TransactionRecord) => !r.returned_at).length;
    const returned = typedTx.filter((r: TransactionRecord) => r.returned_at).length;

    setUser(u as User);
    setRecords(typedTx);
    setActiveCount(active);
    setReturnedCount(returned);
    setLoading(false);
  };

  const StatusBadge = ({ tx }: StatusBadgeProps) => {
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

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Theme.colors.navy} />
        <Text style={styles.loadingText}>Loading user history...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header with Back Button */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Icon name="arrow-left" size={24} color={Theme.colors.navy} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Borrow History</Text>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* User Info Card */}
        {user && (
          <View style={styles.userCard}>
            <View style={styles.userInfo}>
              {user.photo_uri && (
                <Image
                  source={{ uri: user.photo_uri }}
                  style={styles.userImage}
                />
              )}
              <View style={styles.userDetails}>
                <Text style={styles.userName}>{user.name}</Text>
                <View style={styles.userIdContainer}>
                  <Icon name="user" size={14} color={Theme.colors.textLight} />
                  <Text style={styles.userId}>ID: {user.fayda_id}</Text>
                </View>
              </View>
            </View>

            {/* User Stats */}
            <View style={styles.userStats}>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{records.length}</Text>
                <Text style={styles.statLabel}>Total</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={[styles.statNumber, styles.activeCount]}>{activeCount}</Text>
                <Text style={styles.statLabel}>Active</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={[styles.statNumber, styles.returnedCount]}>{returnedCount}</Text>
                <Text style={styles.statLabel}>Returned</Text>
              </View>
            </View>
          </View>
        )}

        {/* History List */}
        {records.length === 0 ? (
          <View style={styles.emptyState}>
            <Icon name="book-open" size={64} color={Theme.colors.textLight} />
            <Text style={styles.emptyStateTitle}>No Borrow History</Text>
            <Text style={styles.emptyStateText}>
              This user has not borrowed any books yet.
            </Text>
          </View>
        ) : (
          <>
            <Text style={styles.sectionTitle}>Borrow Records</Text>
            {records.map((tx: TransactionRecord) => (
              <View key={tx.tx_id} style={styles.card}>
                {/* Status and Title */}
                <View style={styles.cardHeader}>
                  <StatusBadge tx={tx} />
                  <Text style={styles.cardTitle} numberOfLines={2}>
                    {tx.book_title || "Unknown Book"}
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

                {/* Book Code */}
                <View style={styles.bookCode}>
                  <Icon name="hash" size={12} color={Theme.colors.textLight} />
                  <Text style={styles.bookCodeText}>Book Code: {tx.book_code}</Text>
                </View>
              </View>
            ))}
          </>
        )}
      </ScrollView>

      {/* Back Button */}
      {/* 

      <View style={styles.footer}>
        <TouchableOpacity
          onPress={() => router.push("/transactions")}
          style={styles.secondaryButton}
        >
          <Icon name="arrow-left" size={20} color={Theme.colors.teal} />
          <Text style={styles.secondaryButtonText}>Check Transactions</Text>
        </TouchableOpacity>
      </View>

       */}

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Theme.colors.cream,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Theme.spacing.md,
    paddingTop: Theme.spacing.lg + 20,
    paddingBottom: Theme.spacing.md,
    backgroundColor: Theme.colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.border,
  },
  backButton: {
    padding: Theme.spacing.sm,
    marginRight: Theme.spacing.sm,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Theme.colors.navy,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: Theme.colors.cream,
    justifyContent: 'center',
    alignItems: 'center',
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
    paddingBottom: Theme.spacing.xl + 80,
  },
  userCard: {
    backgroundColor: Theme.colors.white,
    borderRadius: Theme.radius.md,
    padding: Theme.spacing.lg,
    marginBottom: Theme.spacing.lg,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    shadowColor: Theme.colors.navy,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Theme.spacing.lg,
  },
  userImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: Theme.spacing.md,
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    ...Theme.typography.h2,
    color: Theme.colors.textDark,
    marginBottom: Theme.spacing.xs,
  },
  userIdContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  userId: {
    ...Theme.typography.caption,
    color: Theme.colors.textLight,
    marginLeft: Theme.spacing.xs,
  },
  userStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Theme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Theme.colors.border,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statNumber: {
    ...Theme.typography.h3,
    color: Theme.colors.navy,
    marginBottom: Theme.spacing.xs,
  },
  activeCount: {
    color: Theme.colors.warning,
  },
  returnedCount: {
    color: Theme.colors.success,
  },
  statLabel: {
    ...Theme.typography.caption,
    color: Theme.colors.textLight,
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: Theme.colors.border,
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
  sectionTitle: {
    ...Theme.typography.h3,
    color: Theme.colors.navy,
    marginBottom: Theme.spacing.md,
    marginTop: Theme.spacing.md,
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
  bookCode: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Theme.spacing.md,
    paddingTop: Theme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Theme.colors.border,
  },
  bookCodeText: {
    ...Theme.typography.caption,
    color: Theme.colors.textLight,
    marginLeft: Theme.spacing.xs,
  },
  footer: {
    padding: Theme.spacing.lg,
    backgroundColor: Theme.colors.white,
    borderTopWidth: 1,
    borderTopColor: Theme.colors.border,
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Theme.colors.white,
    borderRadius: Theme.radius.md,
    paddingVertical: Theme.spacing.lg,
    paddingHorizontal: Theme.spacing.xl,
    borderWidth: 1,
    borderColor: Theme.colors.teal,
  },
  secondaryButtonText: {
    color: Theme.colors.teal,
    fontSize: 16,
    fontWeight: '600',
    marginLeft: Theme.spacing.sm,
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
});