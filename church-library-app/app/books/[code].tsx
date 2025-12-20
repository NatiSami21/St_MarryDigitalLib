import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Alert,
  ActivityIndicator,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Dimensions,
  Modal,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons, Feather, MaterialIcons, MaterialCommunityIcons } from "@expo/vector-icons";

import QRCode from "react-native-qrcode-svg";
import * as MediaLibrary from "expo-media-library";
import * as FileSystem from "expo-file-system/legacy";

import { getBookByCode } from "../../db/books";
import { events } from "../../utils/events";

const { width } = Dimensions.get("window");

interface Book {
  id: number;
  book_code: string;
  title: string;
  author: string;
  publisher?: string;
  year?: number;
  isbn?: string;
  category?: string;
  notes?: string;
  copies: number;
  available_copies: number;
  created_at: string;
}

export default function BookDetails() {
  const { code } = useLocalSearchParams();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [book, setBook] = useState<Book | null>(null);
  const [loading, setLoading] = useState(true);
  const [showQRModal, setShowQRModal] = useState(false);
  const [savingQR, setSavingQR] = useState(false);

  const qrRef = useRef<any>(null);

  // Fetch book
  const loadBook = async () => {
    try {
      const data = await getBookByCode(code as string);
      if (data) {
        setBook(data as Book);
      } else {
        Alert.alert("Not Found", "Book not found.");
        router.back();
      }
    } catch (err) {
      console.log("Fetch error:", err);
      Alert.alert("Error", "Failed to load book details.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBook();
    
    // Listen for updates
    const sub = events.listen("refresh-books", loadBook);
    return () => sub.remove();
  }, [code]);

  // Save QR to gallery
  const saveQrToGallery = async () => {
    if (!qrRef.current || !book) {
      Alert.alert("Error", "QR code is not ready.");
      return;
    }

    setSavingQR(true);
    try {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission Required", "Gallery access is needed to save QR codes.");
        return;
      }

      const base64 = await new Promise<string>((resolve) => {
        qrRef.current.toDataURL((data: string) => resolve(data));
      });

      const fileUri = FileSystem.cacheDirectory + `book-${book.book_code}.png`;

      await FileSystem.writeAsStringAsync(fileUri, base64, {
        encoding: FileSystem.EncodingType.Base64,
      });

      const asset = await MediaLibrary.createAssetAsync(fileUri);
      await MediaLibrary.createAlbumAsync("FAYDA Library", asset, false);

      Alert.alert("Success", "QR code saved to gallery!");
      await FileSystem.deleteAsync(fileUri).catch(() => {});
    } catch (error) {
      console.log("QR Save Error:", error);
      Alert.alert("Error", "Could not save QR code.");
    } finally {
      setSavingQR(false);
    }
  };

  const getStatusInfo = () => {
    if (!book) return { text: "Loading", color: "#7F8C8D", bgColor: "#F8FAFC" };
    
    if (book.available_copies > 0) {
      return { text: "Available", color: "#27AE60", bgColor: "#F0FFF4" };
    } else {
      return { text: "Borrowed", color: "#E74C3C", bgColor: "#FDF2F2" };
    }
  };

  const statusInfo = getStatusInfo();

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar backgroundColor="#FFFFFF" barStyle="dark-content" />
        <ActivityIndicator size="large" color="#003153" />
        <Text style={styles.loadingText}>Loading book details...</Text>
      </View>
    );
  }

  if (!book) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar backgroundColor="#FFFFFF" barStyle="dark-content" />
        <Text style={styles.errorText}>Book not found</Text>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const DetailRow = ({ icon, label, value }: { icon: string; label: string; value: string | number | undefined }) => {
    // Safely convert value to string
    const displayValue = value !== undefined && value !== null ? String(value) : "Not specified";
    
    return (
      <View style={styles.detailRow}>
        <View style={styles.detailLabel}>
          <Feather name={icon as any} size={18} color="#005B82" />
          <Text style={styles.detailLabelText}>{label}</Text>
        </View>
        <Text style={styles.detailValue}>{displayValue}</Text>
      </View>
    );
  };

  const QRModal = () => (
    <Modal
      visible={showQRModal}
      transparent
      animationType="fade"
      onRequestClose={() => setShowQRModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.qrModal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Book QR Code</Text>
            <TouchableOpacity
              onPress={() => setShowQRModal(false)}
              style={styles.modalCloseButton}
            >
              <Feather name="x" size={24} color="#003153" />
            </TouchableOpacity>
          </View>
          
          <View style={styles.qrContainer}>
            <QRCode
              value={book.book_code}
              size={240}
              getRef={(c) => (qrRef.current = c)}
              backgroundColor="#FFFFFF"
              color="#003153"
            />
            <Text style={styles.qrCodeText}>{book.book_code}</Text>
          </View>
          
          <View style={styles.modalActions}>
            <TouchableOpacity
              style={styles.saveQRButton}
              onPress={saveQrToGallery}
              disabled={savingQR}
            >
              {savingQR ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <>
                  <Feather name="download" size={20} color="#FFFFFF" />
                  <Text style={styles.saveQRButtonText}>Save to Gallery</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

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
            <Text style={styles.headerTitle}>Book Details</Text>
            <Text style={styles.headerSubtitle}>Code: {book.book_code}</Text>
          </View>
          
          <TouchableOpacity
            style={styles.qrButton}
            onPress={() => setShowQRModal(true)}
          >
            <Feather name="maximize" size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      {/* Content */}
      <ScrollView 
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.contentContainer}
      >
        {/* Book Info Card */}
        <View style={styles.bookInfoCard}>
          <View style={styles.bookHeader}>
            <View style={styles.statusBadge}>
              <View style={[styles.statusDot, { backgroundColor: statusInfo.color }]} />
              <Text style={[styles.statusText, { color: statusInfo.color }]}>
                {statusInfo.text}
              </Text>
            </View>
            
            <View style={styles.availabilityChip}>
              <Feather name="book-open" size={14} color="#D4AF37" />
              <Text style={styles.availabilityText}>
                {book.available_copies}/{book.copies} copies available
              </Text>
            </View>
          </View>
          
          <Text style={styles.bookTitle}>{book.title}</Text>
          <Text style={styles.bookAuthor}>{book.author}</Text>
          
          {book.category && (
            <View style={styles.categoryTag}>
              <Feather name="folder" size={14} color="#D4AF37" />
              <Text style={styles.categoryText}>{book.category}</Text>
            </View>
          )}
        </View>

        {/* Details Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Book Information</Text>
          
          <View style={styles.detailsGrid}>
            {book.publisher && (
              <DetailRow icon="book-open" label="Publisher" value={book.publisher} />
            )}
            
            {/* Fixed: Safe year display */}
            <DetailRow 
              icon="calendar" 
              label="Year" 
              value={book.year} 
            />
            
            {book.isbn && (
              <DetailRow icon="hash" label="ISBN" value={book.isbn} />
            )}
            
            {/*
            <DetailRow 
              icon="hash" 
              label="Book Code" 
              value={book.book_code} 
            />
            */}
            
            <DetailRow 
              icon="copy" 
              label="Total Copies" 
              value={book.copies} 
            />
            
          </View>
        </View>

        {/* Notes Section */}
        {book.notes && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Notes</Text>
            <View style={styles.notesCard}>
              <Feather name="file-text" size={18} color="#005B82" />
              <Text style={styles.notesText}>{book.notes}</Text>
            </View>
          </View>
        )}

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => router.push(`/books/history/${book.book_code}`)}
          >
            <MaterialIcons name="history" size={24} color="#005B82" />
            <View style={styles.actionTextContainer}>
              <Text style={styles.actionTitle}>View Borrow History</Text>
              <Text style={styles.actionSubtitle}>See all transactions for this book</Text>
            </View>
            <Feather name="chevron-right" size={24} color="#E5E0D5" />
          </TouchableOpacity>
          
          {/* 

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => router.push(`/borrow?book_code=${book.book_code}`)}
          >
            <MaterialCommunityIcons name="book-plus" size={24} color="#27AE60" />
            <View style={styles.actionTextContainer}>
              <Text style={styles.actionTitle}>Borrow This Book</Text>
              <Text style={styles.actionSubtitle}>Issue to a library user</Text>
            </View>
            <Feather name="chevron-right" size={24} color="#E5E0D5" />
          </TouchableOpacity>
          
           */}

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => setShowQRModal(true)}
          >
            <Feather name="maximize-2" size={24} color="#D4AF37" />
            <View style={styles.actionTextContainer}>
              <Text style={styles.actionTitle}>View QR Code</Text>
              <Text style={styles.actionSubtitle}>Show full screen QR code</Text>
            </View>
            <Feather name="chevron-right" size={24} color="#E5E0D5" />
          </TouchableOpacity>
        </View>

        {/* Small QR Preview */}
        {/* 
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Access</Text>
          <View style={styles.qrPreviewCard}>
            <QRCode
              value={book.book_code}
              size={120}
              getRef={(c) => (qrRef.current = c)}
              backgroundColor="#FFFFFF"
              color="#003153"
            />
            <View style={styles.qrPreviewText}>
              <Text style={styles.qrPreviewTitle}>Scan to Borrow</Text>
              <Text style={styles.qrPreviewSubtitle}>Use this QR code for quick borrowing</Text>
            </View>
          </View>
        </View>
        */}
      </ScrollView>

      {/* Fixed Bottom Actions */}
      <SafeAreaView style={styles.bottomActions} edges={['bottom']}>
        <View style={styles.bottomButtons}>
          <TouchableOpacity
            style={styles.secondaryAction}
            onPress={() => router.push("/books/list")}
          >
            <Ionicons name="library" size={20} color="#003153" />
            <Text style={styles.secondaryActionText}>All Books</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.primaryAction}
            onPress={() => router.push(`/borrow?book_code=${book.book_code}`)}
          >
            <Feather name="check-circle" size={20} color="#FFFFFF" />
            <Text style={styles.primaryActionText}>Borrow Now</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      {/* QR Modal */}
      <QRModal />
    </View>
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
  errorText: {
    fontSize: 18,
    color: "#E74C3C",
    marginBottom: 20,
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
    paddingBottom: 20,
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
  qrButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#005B82",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#005B82",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  // Content
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 120,
  },
  // Book Info Card
  bookInfoCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 24,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: "#E5E0D5",
    shadowColor: "#003153",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 5,
  },
  bookHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: "#F8FAFC",
    gap: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
  },
  availabilityChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: "#FFF5E1",
    gap: 6,
  },
  availabilityText: {
    fontSize: 12,
    color: "#D4AF37",
    fontWeight: "600",
  },
  bookTitle: {
    fontSize: 28,
    fontWeight: "800",
    color: "#003153",
    marginBottom: 8,
    lineHeight: 34,
  },
  bookAuthor: {
    fontSize: 18,
    color: "#005B82",
    fontWeight: "600",
    marginBottom: 16,
  },
  categoryTag: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F0F7FF",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    gap: 8,
  },
  categoryText: {
    fontSize: 14,
    color: "#005B82",
    fontWeight: "600",
  },
  // Sections
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#003153",
    marginBottom: 16,
  },
  // Details Grid
  detailsGrid: {
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
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F7FF",
  },
  detailLabel: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  detailLabelText: {
    fontSize: 16,
    color: "#005B82",
    fontWeight: "500",
  },
  detailValue: {
    fontSize: 16,
    color: "#003153",
    fontWeight: "600",
  },
  // Notes
  notesCard: {
    flexDirection: "row",
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
    gap: 16,
  },
  notesText: {
    flex: 1,
    fontSize: 16,
    color: "#7F8C8D",
    lineHeight: 24,
  },
  // Action Buttons
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E5E0D5",
    shadowColor: "#003153",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  actionTextContainer: {
    flex: 1,
    marginLeft: 16,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#003153",
    marginBottom: 4,
  },
  actionSubtitle: {
    fontSize: 14,
    color: "#7F8C8D",
  },
  // QR Preview
  qrPreviewCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: "#E5E0D5",
    shadowColor: "#003153",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 5,
  },
  qrPreviewText: {
    flex: 1,
    marginLeft: 24,
  },
  qrPreviewTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#003153",
    marginBottom: 8,
  },
  qrPreviewSubtitle: {
    fontSize: 14,
    color: "#7F8C8D",
    lineHeight: 20,
  },
  // Bottom Actions
  bottomActions: {
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#E5E0D5",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 10,
  },
  bottomButtons: {
    flexDirection: "row",
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 12,
  },
  secondaryAction: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E5E0D5",
    gap: 8,
  },
  secondaryActionText: {
    fontSize: 16,
    color: "#003153",
    fontWeight: "600",
  },
  primaryAction: {
    flex: 2,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: "#003153",
    gap: 8,
    shadowColor: "#003153",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryActionText: {
    fontSize: 16,
    color: "#FFFFFF",
    fontWeight: "600",
  },
  // QR Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  qrModal: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 32,
    width: "100%",
    maxWidth: 400,
    alignItems: "center",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    width: "100%",
    marginBottom: 32,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#003153",
  },
  modalCloseButton: {
    padding: 8,
  },
  qrContainer: {
    alignItems: "center",
    marginBottom: 32,
  },
  qrCodeText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#003153",
    marginTop: 20,
    letterSpacing: 1,
  },
  modalActions: {
    width: "100%",
  },
  saveQRButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: "#005B82",
    gap: 8,
    shadowColor: "#005B82",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  saveQRButtonText: {
    fontSize: 16,
    color: "#FFFFFF",
    fontWeight: "600",
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#003153",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
    shadowColor: "#003153",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  backButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
});