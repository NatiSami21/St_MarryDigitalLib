// app/books/register.tsx
import React, { useRef, useState } from "react";
import {
  View,
  Text,
  TextInput,
  Alert,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";

import QRCode from "react-native-qrcode-svg";
import * as MediaLibrary from "expo-media-library";
import * as FileSystem from "expo-file-system/legacy"; 

import { addBook } from "../../db/books";
import { events } from "../../utils/events";
import { getSession } from "../../lib/session";
import { isInsideShift } from "../../utils/shift";

export default function RegisterBook() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const qrRef = useRef<any>(null);

  // Form state
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [category, setCategory] = useState("");
  const [notes, setNotes] = useState("");
  const [copies, setCopies] = useState("1");
  const [loading, setLoading] = useState(false);

  // Success state
  const [createdBookCode, setCreatedBookCode] = useState<string | null>(null);

  /**
   * 🔐 ACTION GUARD
   * Must be called before ANY write
   */
  const assertCanWrite = async (): Promise<boolean> => {
    const session = await getSession();

    if (!session) {
      Alert.alert("Session Expired", "Please log in again.");
      router.replace("/auth/login");
      return false;
    }

    // Admin bypass
    if (session.role === "admin") return true;

    const allowed = await isInsideShift(session.username);
    if (!allowed) {
      Alert.alert(
        "Action Blocked",
        "❌ Your shift has ended. You cannot perform this action."
      );
      return false;
    }

    return true;
  };

  // Save QR as image
  const saveQrToGallery = async () => {
    try {
      if (!qrRef.current) {
        Alert.alert("Error", "QR code is not generated yet.");
        return;
      }

      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permission Required",
          "Please allow gallery access to save QR codes."
        );
        return;
      }

      const base64 = await new Promise<string>((resolve) => {
        qrRef.current.toDataURL((data: string) => resolve(data));
      });

      const fileUri = FileSystem.cacheDirectory + `book-${createdBookCode}.png`;

      await FileSystem.writeAsStringAsync(fileUri, base64, {
        encoding: FileSystem.EncodingType.Base64,
      });

      const asset = await MediaLibrary.createAssetAsync(fileUri);
      await MediaLibrary.createAlbumAsync("FAYDA Library", asset, false);

      Alert.alert("Success", "QR code saved to gallery!");
      await FileSystem.deleteAsync(fileUri).catch(() => {});
    } catch (error) {
      console.log("QR Save Error:", error);
      Alert.alert("Error", "Could not save QR code to gallery.");
    }
  };

  // Submit handler
  const handleRegister = async () => {
    const allowed = await assertCanWrite();
    if (!allowed) return;

    if (!title.trim()) return Alert.alert("Error", "Title is required.");
    if (!author.trim()) return Alert.alert("Error", "Author is required.");

    setLoading(true);
    try {
      const code = await addBook({
        title,
        author,
        category,
        notes,
        copies: parseInt(copies) || 1,
      });

      setCreatedBookCode(code);
      events.emit("refresh-books");
      events.emit("refresh-dashboard");
    } catch (err) {
      console.log("Book add error:", err);
      Alert.alert("Error", "Failed to add book.");
    } finally {
      setLoading(false);
    }
  };

  // If saved → show QR screen
  if (createdBookCode) {
    return (
      <View style={styles.successContainer}>
        <StatusBar backgroundColor="#FFFFFF" barStyle="dark-content" />
        <SafeAreaView style={styles.successContent}>
          <View style={styles.successHeader}>
            <View style={styles.successIcon}>
              <Feather name="check-circle" size={32} color="#27AE60" />
            </View>
            <Text style={styles.successTitle}>Book Registered!</Text>
            <Text style={styles.successSubtitle}>Book Code: {createdBookCode}</Text>
          </View>

          <View style={styles.qrContainer}>
            <QRCode
              value={createdBookCode}
              size={200}
              getRef={(c) => (qrRef.current = c)}
            />
          </View>

          <View style={styles.successActions}>
            <TouchableOpacity
              style={styles.secondaryAction}
              onPress={saveQrToGallery}
            >
              <Feather name="download" size={20} color="#005B82" />
              <Text style={styles.secondaryActionText}>Save QR Code</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.primaryAction}
              onPress={() => {
                setCreatedBookCode(null);
                setTitle("");
                setAuthor("");
                setCategory("");
                setNotes("");
                setCopies("1");
              }}
            >
              <Feather name="plus" size={20} color="#FFFFFF" />
              <Text style={styles.primaryActionText}>Add Another Book</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.closeModalButton}
            onPress={() => router.push("/books/list")}
          >
            <Text style={styles.closeModalText}>Back to Book List</Text>
          </TouchableOpacity>
        </SafeAreaView>
      </View>
    );
  }

  // Main form UI
  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <StatusBar backgroundColor="#FFFFFF" barStyle="dark-content" />
      
      <SafeAreaView style={[styles.header, { paddingTop: insets.top }]} edges={['top']}>
        <View style={styles.headerContent}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Feather name="arrow-left" size={24} color="#003153" />
          </TouchableOpacity>
          
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle}>Register New Book</Text>
            <Text style={styles.headerSubtitle}>Add book to library collection</Text>
          </View>
          
          <View style={styles.headerRight} />
        </View>
      </SafeAreaView>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.formContainer}>
          <View style={styles.formHeader}>
            <View style={styles.formIcon}>
              <Feather name="book-open" size={24} color="#003153" />
            </View>
            <View>
              <Text style={styles.formTitle}>Book Details</Text>
              <Text style={styles.formSubtitle}>Fill in the book information below</Text>
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Book Title *</Text>
            <View style={styles.inputContainer}>
              <Feather name="type" size={20} color="#7F8C8D" style={styles.inputIcon} />
              <TextInput
                style={styles.textInput}
                placeholder="Enter book title"
                placeholderTextColor="#A0AEC0"
                value={title}
                onChangeText={setTitle}
                maxLength={200}
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Author *</Text>
            <View style={styles.inputContainer}>
              <Feather name="user" size={20} color="#7F8C8D" style={styles.inputIcon} />
              <TextInput
                style={styles.textInput}
                placeholder="Enter author name"
                placeholderTextColor="#A0AEC0"
                value={author}
                onChangeText={setAuthor}
                maxLength={100}
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Category</Text>
            <View style={styles.inputContainer}>
              <Feather name="folder" size={20} color="#7F8C8D" style={styles.inputIcon} />
              <TextInput
                style={styles.textInput}
                placeholder="Enter category (optional)"
                placeholderTextColor="#A0AEC0"
                value={category}
                onChangeText={setCategory}
                maxLength={50}
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Number of Copies *</Text>
            <View style={styles.inputContainer}>
              <Feather name="copy" size={20} color="#7F8C8D" style={styles.inputIcon} />
              <TextInput
                style={styles.textInput}
                placeholder="Enter number of copies"
                placeholderTextColor="#A0AEC0"
                value={copies}
                onChangeText={setCopies}
                keyboardType="numeric"
                maxLength={3}
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Notes (Optional)</Text>
            <View style={[styles.inputContainer, styles.multilineContainer]}>
              <Feather name="file-text" size={20} color="#7F8C8D" style={styles.inputIcon} />
              <TextInput
                style={[styles.textInput, styles.multilineInput]}
                placeholder="Any additional notes about the book"
                placeholderTextColor="#A0AEC0"
                value={notes}
                onChangeText={setNotes}
                multiline
                numberOfLines={4}
                maxLength={500}
              />
            </View>
          </View>

          <View style={styles.formActions}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => router.back()}
              disabled={loading}
            >
              <Feather name="x" size={20} color="#7F8C8D" />
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.submitButton}
              onPress={handleRegister}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <>
                  <Feather name="check" size={20} color="#FFFFFF" />
                  <Text style={styles.submitButtonText}>Register Book</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.guidelines}>
            <Text style={styles.guidelinesTitle}>Guidelines</Text>
            <View style={styles.guidelineItem}>
              <Feather name="check-circle" size={16} color="#27AE60" />
              <Text style={styles.guidelineText}>
                Fields marked with * are required
              </Text>
            </View>
            <View style={styles.guidelineItem}>
              <Feather name="info" size={16} color="#005B82" />
              <Text style={styles.guidelineText}>
                Book code will be automatically generated
              </Text>
            </View>
            <View style={styles.guidelineItem}>
              <Feather name="camera" size={16} color="#D4AF37" />
              <Text style={styles.guidelineText}>
                QR code will be generated for each book
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FDFBF7",
  },
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
  backButton: {
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
  headerRight: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  formContainer: {
    paddingHorizontal: 20,
    paddingTop: 24,
  },
  formHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 32,
  },
  formIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: "#F0F7FF",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  formTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#003153",
    marginBottom: 4,
  },
  formSubtitle: {
    fontSize: 16,
    color: "#7F8C8D",
  },
  inputGroup: {
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#003153",
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E0D5",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: Platform.OS === 'ios' ? 16 : 12,
  },
  multilineContainer: {
    alignItems: "flex-start",
  },
  inputIcon: {
    marginRight: 12,
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    color: "#003153",
    padding: 0,
  },
  multilineInput: {
    minHeight: 100,
    textAlignVertical: "top",
    paddingTop: Platform.OS === 'ios' ? 8 : 4,
  },
  formActions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 32,
    marginBottom: 40,
  },
  cancelButton: {
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
  cancelButtonText: {
    fontSize: 16,
    color: "#7F8C8D",
    fontWeight: "600",
  },
  submitButton: {
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
  submitButtonText: {
    fontSize: 16,
    color: "#FFFFFF",
    fontWeight: "600",
  },
  guidelines: {
    backgroundColor: "#F8FAFC",
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: "#E5E0D5",
  },
  guidelinesTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#003153",
    marginBottom: 16,
  },
  guidelineItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    gap: 12,
  },
  guidelineText: {
    fontSize: 14,
    color: "#7F8C8D",
    flex: 1,
    lineHeight: 20,
  },
  // Success Screen Styles
  successContainer: {
    flex: 1,
    backgroundColor: "#FDFBF7",
  },
  successContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  successHeader: {
    alignItems: "center",
    marginBottom: 32,
  },
  successIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#F0FFF4",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#003153",
    textAlign: "center",
    marginBottom: 8,
  },
  successSubtitle: {
    fontSize: 16,
    color: "#7F8C8D",
    textAlign: "center",
  },
  qrContainer: {
    backgroundColor: "#FFFFFF",
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E5E0D5",
    marginBottom: 32,
  },
  successActions: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 24,
    width: "100%",
  },
  secondaryAction: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: "#F0F7FF",
    borderWidth: 1,
    borderColor: "#005B82",
    gap: 8,
  },
  secondaryActionText: {
    fontSize: 16,
    color: "#005B82",
    fontWeight: "600",
  },
  primaryAction: {
    flex: 2,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
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
  closeModalButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  closeModalText: {
    fontSize: 16,
    color: "#7F8C8D",
    fontWeight: "500",
  },
});