// church-library-app/app/borrow/confirm.tsx

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
import { borrowBook, getActiveBorrow } from "../../db/transactions";
import { events } from "../../utils/events";
import { getSession } from "../../lib/session";
import { isInsideShift } from "../../utils/shift";
import { Theme } from "../../styles/theme";

function toStringParam(v: string | string[] | undefined): string {
  if (!v) return "";
  return Array.isArray(v) ? v[0] : v;
}

export default function ConfirmBorrow() {
  const params = useLocalSearchParams();
  const book_code = toStringParam(params.book_code);
  const fayda_id = toStringParam(params.fayda_id);

  const router = useRouter();

  const [user, setUser] = useState<any>(null);
  const [book, setBook] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [alreadyBorrowed, setAlreadyBorrowed] = useState(false);

  useEffect(() => {
    async function load() {
      const u = await getUser(fayda_id);
      const b = await getBook(book_code);

      setUser(u);
      setBook(b);
      setLoading(false);

      if (!u) Alert.alert("User Not Found", "The scanned user ID was not found in the system.");
      if (!b) Alert.alert("Book Not Found", "The scanned book code was not found in the system.");
      
      // Check if already borrowed
      if (u && b) {
        const exists = await getActiveBorrow(u.fayda_id, book_code);
        setAlreadyBorrowed(!!exists);
      }
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
        "Your shift has ended. You cannot borrow books."
      );
      return false;
    }

    return true;
  };

  const handleConfirm = async () => {
    const allowed = await assertCanWrite();
    if (!allowed) return;

    if (!user || !book) return;

    if (alreadyBorrowed) {
      Alert.alert("Already Borrowed", "This user has already borrowed this book.");
      return;
    }

    if (book.copies <= 0) {
      Alert.alert("No Copies Available", "All copies of this book are currently borrowed.");
      return;
    }

    setProcessing(true);

    try {
      await borrowBook(user.fayda_id, book_code);

      Alert.alert("Success", "Book Borrowed Successfully!", [
        {
          text: "OK",
          onPress: () => router.replace("/transactions"),
        },
      ]);

      events.emit("refresh-dashboard");
      events.emit("refresh-books");
      events.emit("refresh-transactions");
    } catch (error) {
      Alert.alert("Error", "Failed to borrow book. Please try again.");
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Theme.colors.navy} />
        <Text style={styles.loadingText}>Loading details...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>Confirm Borrow</Text>
        <Text style={styles.subtitle}>Review details before confirming</Text>

        {/* USER CARD */}
        {user && (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Icon name="user" size={24} color={Theme.colors.navy} />
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

            <View style={styles.detailGrid}>
              <View style={styles.detailItem}>
                <Icon name="users" size={16} color={Theme.colors.textLight} />
                <Text style={styles.detailLabel}>Gender</Text>
                <Text style={styles.detailValue}>{user.gender || 'N/A'}</Text>
              </View>
              <View style={styles.detailItem}>
                <Icon name="phone" size={16} color={Theme.colors.textLight} />
                <Text style={styles.detailLabel}>Phone</Text>
                <Text style={styles.detailValue}>{user.phone || 'N/A'}</Text>
              </View>
            </View>
            
            {user.address && (
              <View style={styles.addressContainer}>
                <Icon name="map-pin" size={16} color={Theme.colors.textLight} />
                <Text style={styles.addressText}>{user.address}</Text>
              </View>
            )}
          </View>
        )}

        {/* BOOK CARD */}
        {book && (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Icon name="book" size={24} color={Theme.colors.navy} />
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
                <Text style={styles.detailLabel}>Copies</Text>
                <Text style={styles.detailValue}>{book.copies}</Text>
              </View>
            </View>

            {/* Status Badge */}
            <View style={[
              styles.statusBadge,
              { backgroundColor: book.copies > 0 ? 'rgba(39, 174, 96, 0.1)' : 'rgba(231, 76, 60, 0.1)' }
            ]}>
              <Icon 
                name={book.copies > 0 ? "check-circle" : "x-circle"} 
                size={16} 
                color={book.copies > 0 ? Theme.colors.success : Theme.colors.error} 
              />
              <Text style={[
                styles.statusText,
                { color: book.copies > 0 ? Theme.colors.success : Theme.colors.error }
              ]}>
                {book.copies > 0 ? 'Available' : 'Out of Stock'}
              </Text>
            </View>

            {alreadyBorrowed && (
              <View style={styles.warningBadge}>
                <Icon name="alert-triangle" size={16} color={Theme.colors.warning} />
                <Text style={styles.warningText}>This user has already borrowed this book</Text>
              </View>
            )}
          </View>
        )}

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
            disabled={processing || !user || !book || alreadyBorrowed || book.copies <= 0}
            style={[
              styles.primaryButton,
              (processing || !user || !book || alreadyBorrowed || book.copies <= 0) && styles.primaryButtonDisabled
            ]}
          >
            {processing ? (
              <ActivityIndicator size="small" color={Theme.colors.white} />
            ) : (
              <>
                <Icon name="check-circle" size={20} color={Theme.colors.white} />
                <Text style={styles.primaryButtonText}>Confirm Borrow</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Instructions */}
        <View style={styles.instructionsCard}>
          <Icon name="info" size={20} color={Theme.colors.teal} />
          <Text style={styles.instructionsText}>
            Please verify all information is correct before confirming. This action cannot be undone.
          </Text>
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
    paddingBottom: Theme.spacing.xl + 80, // Extra padding for tab bar
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
    color: Theme.colors.navy,
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
    shadowColor: Theme.colors.navy,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Theme.spacing.lg,
  },
  cardTitle: {
    ...Theme.typography.h3,
    color: Theme.colors.navy,
    marginLeft: Theme.spacing.sm,
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
    marginBottom: Theme.spacing.lg,
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
    marginBottom: Theme.spacing.lg,
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
  addressContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: Theme.spacing.md,
  },
  addressText: {
    ...Theme.typography.body,
    color: Theme.colors.textDark,
    marginLeft: Theme.spacing.sm,
    flex: 1,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingVertical: Theme.spacing.sm,
    paddingHorizontal: Theme.spacing.md,
    borderRadius: Theme.radius.lg,
    marginTop: Theme.spacing.sm,
  },
  statusText: {
    ...Theme.typography.caption,
    fontWeight: '600',
    marginLeft: Theme.spacing.xs,
  },
  warningBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(243, 156, 18, 0.1)',
    padding: Theme.spacing.md,
    borderRadius: Theme.radius.md,
    marginTop: Theme.spacing.lg,
  },
  warningText: {
    ...Theme.typography.caption,
    color: Theme.colors.warning,
    marginLeft: Theme.spacing.sm,
    flex: 1,
  },
  actionButtons: {
    flexDirection: 'row',
    marginBottom: Theme.spacing.xl,
  },
  primaryButton: {
    flex: 1,
    backgroundColor: Theme.colors.navy,
    borderRadius: Theme.radius.md,
    paddingVertical: Theme.spacing.lg,
    paddingHorizontal: Theme.spacing.xl,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: Theme.spacing.md,
    shadowColor: Theme.colors.navy,
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
    backgroundColor: 'rgba(0, 91, 130, 0.05)',
    borderRadius: Theme.radius.md,
    padding: Theme.spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(0, 91, 130, 0.1)',
  },
  instructionsText: {
    ...Theme.typography.caption,
    color: Theme.colors.teal,
    marginLeft: Theme.spacing.md,
    flex: 1,
  },
});