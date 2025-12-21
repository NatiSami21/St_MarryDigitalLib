// church-library-app/app/return/confirm.tsx
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ActivityIndicator,
  Image,
  TouchableOpacity,
  Alert,
  ScrollView,
  StyleSheet,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import Icon from 'react-native-vector-icons/Feather';

import { getUser } from "../../db/users";
import { getBook } from "../../db/books";
import { getActiveBorrow, completeReturn } from "../../db/transactions";
import { events } from "../../utils/events";
import { getSession } from "../../lib/session";
import { isInsideShift } from "../../utils/shift";
import { Theme } from "../../styles/theme";

function toStringParam(v: string | string[] | undefined): string {
  if (!v) return "";
  return Array.isArray(v) ? v[0] : v;
}

export default function ConfirmReturn() {
  const params = useLocalSearchParams();
  const book_code = toStringParam(params.book_code);
  const fayda_id = toStringParam(params.fayda_id);

  const router = useRouter();

  const [user, setUser] = useState<any>(null);
  const [book, setBook] = useState<any>(null);
  const [activeBorrow, setActiveBorrow] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    async function load() {
      const u = await getUser(fayda_id);
      const b = await getBook(book_code);
      const borrow = await getActiveBorrow(fayda_id, book_code);

      setUser(u);
      setBook(b);
      setActiveBorrow(borrow);
      setLoading(false);

      if (!u) Alert.alert("User Not Found", "The scanned user ID was not found in the system.");
      if (!b) Alert.alert("Book Not Found", "The scanned book code was not found in the system.");
    }
    load();
  }, []);

  const assertCanWrite = async (): Promise<boolean> => {
    const session = await getSession();

    if (!session) {
      Alert.alert("Session Expired", "Please log in again.");
      router.replace("/auth/login");
      return false;
    }

    if (session.role === "admin") return true;

    const allowed = await isInsideShift(session.username);
    if (!allowed) {
      Alert.alert(
        "Action Blocked",
        "Your shift has ended. You cannot return books."
      );
      return false;
    }

    return true;
  };

  const handleConfirm = async () => {
    const allowed = await assertCanWrite();
    if (!allowed) return;

    if (!user || !book) return;

    if (!activeBorrow) {
      Alert.alert("No Active Borrow", "This user has not borrowed this book.");
      return;
    }

    setProcessing(true);

    try {
      const session = await getSession();

      const ok = await completeReturn({
        tx_id: activeBorrow.tx_id,
        book_code,
        librarian_username: session?.username ?? "unknown",
        device_id: activeBorrow.device_id ?? "unknown-device"
      });

      if (!ok) {
        Alert.alert("Error", "Borrow record not found or already returned.");
        setProcessing(false);
        return;
      }

      Alert.alert("Success", "Book Returned Successfully!", [
        { text: "OK", onPress: () => router.replace("/transactions") }
      ]);

      events.emit("refresh-dashboard");
      events.emit("refresh-transactions");
    } catch (error) {
      Alert.alert("Error", "Failed to return book. Please try again.");
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Theme.colors.teal} />
        <Text style={styles.loadingText}>Verifying return details...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>Confirm Return</Text>
        <Text style={styles.subtitle}>Review details before confirming return</Text>

        {/* User Card */}
        {user && (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Icon name="user" size={24} color={Theme.colors.teal} />
              <Text style={styles.cardTitle}>User Details</Text>
            </View>
            
            <View style={styles.userInfo}>
              {user.photo_uri && (
                <Image
                  source={{ uri: user.photo_uri }}
                  style={styles.userImage}
                />
              )}
              <View style={styles.userTextInfo}>
                <Text style={styles.userName}>{user.name}</Text>
                <Text style={styles.userId}>ID: {user.fayda_id}</Text>
              </View>
            </View>
          </View>
        )}

        {/* Book Card */}
        {book && (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Icon name="book" size={24} color={Theme.colors.teal} />
              <Text style={styles.cardTitle}>Book Details</Text>
            </View>

            <View style={styles.bookInfo}>
              <View style={styles.bookTextInfo}>
                <Text style={styles.bookTitle}>{book.title}</Text>
                <Text style={styles.bookAuthor}>by {book.author || 'Unknown'}</Text>
              </View>
            </View>

            <View style={styles.detailGrid}>
              <View style={styles.detailItem}>
                <Icon name="hash" size={16} color={Theme.colors.textLight} />
                <Text style={styles.detailLabel}>Code</Text>
                <Text style={styles.detailValue}>{book.code}</Text>
              </View>
              <View style={styles.detailItem}>
                <Icon name="copy" size={16} color={Theme.colors.textLight} />
                <Text style={styles.detailLabel}>Copies After Return</Text>
                <Text style={styles.detailValue}>{book.copies + 1}</Text>
              </View>
            </View>
          </View>
        )}

        {/* Borrow Status Card */}
        <View style={[
          styles.card,
          activeBorrow ? styles.activeBorrowCard : styles.noBorrowCard
        ]}>
          <View style={styles.borrowHeader}>
            <Icon 
              name={activeBorrow ? "check-circle" : "x-circle"} 
              size={24} 
              color={activeBorrow ? Theme.colors.success : Theme.colors.error} 
            />
            <Text style={styles.borrowTitle}>
              {activeBorrow ? 'Active Borrow Found' : 'No Active Borrow'}
            </Text>
          </View>
          
          {activeBorrow ? (
            <>
              <Text style={styles.borrowText}>
                Borrowed on: {activeBorrow.timestamp}
              </Text>
              {activeBorrow.due_date && (
                <Text style={styles.borrowText}>
                  Due date: {activeBorrow.due_date}
                </Text>
              )}
              <View style={styles.statusBadge}>
                <Icon name="clock" size={16} color={Theme.colors.teal} />
                <Text style={styles.statusText}>Currently Borrowed</Text>
              </View>
            </>
          ) : (
            <Text style={styles.noBorrowText}>
              This user has not borrowed this book. Please verify the book code and user ID.
            </Text>
          )}
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.secondaryButton}
            disabled={processing}
          >
            <Icon name="arrow-left" size={20} color={Theme.colors.teal} />
            <Text style={styles.secondaryButtonText}>Back</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            onPress={handleConfirm}
            disabled={processing || !activeBorrow}
            style={[
              styles.primaryButton,
              (processing || !activeBorrow) && styles.primaryButtonDisabled
            ]}
          >
            {processing ? (
              <ActivityIndicator size="small" color={Theme.colors.white} />
            ) : (
              <>
                <Icon name="check-circle" size={20} color={Theme.colors.white} />
                <Text style={styles.primaryButtonText}>Confirm Return</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Return Instructions */}
        <View style={styles.instructionsCard}>
          <Icon name="info" size={20} color={Theme.colors.gold} />
          <View style={styles.instructionsContent}>
            <Text style={styles.instructionsTitle}>Return Instructions</Text>
            <Text style={styles.instructionsText}>
              • Verify the physical book condition before confirming{'\n'}
              • Ensure all accessories (CDs, bookmarks) are returned{'\n'}
              • Update the book's condition in the system if needed{'\n'}
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Theme.colors.cream,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: Theme.spacing.lg,
    paddingBottom: Theme.spacing.xl + 80,
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
  title: {
    ...Theme.typography.h1,
    color: Theme.colors.teal,
    marginBottom: Theme.spacing.xs,
  },
  subtitle: {
    ...Theme.typography.body,
    color: Theme.colors.textLight,
    marginBottom: Theme.spacing.xl,
  },
  card: {
    backgroundColor: Theme.colors.white,
    borderRadius: Theme.radius.md,
    padding: Theme.spacing.lg,
    marginBottom: Theme.spacing.lg,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    shadowColor: Theme.colors.teal,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  activeBorrowCard: {
    borderLeftWidth: 4,
    borderLeftColor: Theme.colors.success,
  },
  noBorrowCard: {
    borderLeftWidth: 4,
    borderLeftColor: Theme.colors.error,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Theme.spacing.lg,
  },
  cardTitle: {
    ...Theme.typography.h3,
    color: Theme.colors.teal,
    marginLeft: Theme.spacing.sm,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Theme.spacing.md,
  },
  userImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: Theme.spacing.md,
  },
  userTextInfo: {
    flex: 1,
  },
  userName: {
    ...Theme.typography.h3,
    color: Theme.colors.textDark,
    marginBottom: Theme.spacing.xs,
  },
  userId: {
    ...Theme.typography.caption,
    color: Theme.colors.textLight,
  },
  bookInfo: {
    marginBottom: Theme.spacing.md,
  },
  bookTextInfo: {
    flex: 1,
  },
  bookTitle: {
    ...Theme.typography.h3,
    color: Theme.colors.textDark,
    marginBottom: Theme.spacing.xs,
  },
  bookAuthor: {
    ...Theme.typography.body,
    color: Theme.colors.textLight,
  },
  detailGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: Theme.spacing.md,
  },
  detailItem: {
    flex: 1,
    marginHorizontal: Theme.spacing.xs,
  },
  detailLabel: {
    ...Theme.typography.caption,
    color: Theme.colors.textLight,
    marginTop: Theme.spacing.xs,
  },
  detailValue: {
    ...Theme.typography.body,
    color: Theme.colors.textDark,
    fontWeight: '500',
  },
  borrowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Theme.spacing.md,
  },
  borrowTitle: {
    ...Theme.typography.h3,
    color: Theme.colors.textDark,
    marginLeft: Theme.spacing.sm,
  },
  borrowText: {
    ...Theme.typography.body,
    color: Theme.colors.textDark,
    marginBottom: Theme.spacing.xs,
  },
  noBorrowText: {
    ...Theme.typography.body,
    color: Theme.colors.error,
    fontStyle: 'italic',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 91, 130, 0.1)',
    alignSelf: 'flex-start',
    paddingVertical: Theme.spacing.sm,
    paddingHorizontal: Theme.spacing.md,
    borderRadius: Theme.radius.lg,
    marginTop: Theme.spacing.md,
  },
  statusText: {
    ...Theme.typography.caption,
    color: Theme.colors.teal,
    fontWeight: '600',
    marginLeft: Theme.spacing.xs,
  },
  actionButtons: {
    flexDirection: 'row',
    marginBottom: Theme.spacing.xl,
  },
  primaryButton: {
    flex: 1,
    backgroundColor: Theme.colors.teal,
    borderRadius: Theme.radius.md,
    paddingVertical: Theme.spacing.lg,
    paddingHorizontal: Theme.spacing.xl,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: Theme.spacing.md,
    shadowColor: Theme.colors.teal,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  primaryButtonDisabled: {
    backgroundColor: Theme.colors.textLight,
  },
  primaryButtonText: {
    color: Theme.colors.white,
    fontSize: 16,
    fontWeight: '600',
    marginLeft: Theme.spacing.sm,
  },
  secondaryButton: {
    flex: 1,
    backgroundColor: Theme.colors.white,
    borderRadius: Theme.radius.md,
    paddingVertical: Theme.spacing.lg,
    paddingHorizontal: Theme.spacing.xl,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Theme.spacing.md,
    borderWidth: 1,
    borderColor: Theme.colors.teal,
  },
  secondaryButtonText: {
    color: Theme.colors.teal,
    fontSize: 16,
    fontWeight: '600',
    marginLeft: Theme.spacing.sm,
  },
  instructionsCard: {
    flexDirection: 'row',
    backgroundColor: 'rgba(212, 175, 55, 0.1)',
    borderRadius: Theme.radius.md,
    padding: Theme.spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.2)',
  },
  instructionsContent: {
    flex: 1,
    marginLeft: Theme.spacing.md,
  },
  instructionsTitle: {
    ...Theme.typography.h3,
    color: Theme.colors.gold,
    marginBottom: Theme.spacing.xs,
  },
  instructionsText: {
    ...Theme.typography.caption,
    color: Theme.colors.textDark,
    lineHeight: 18,
  },
});