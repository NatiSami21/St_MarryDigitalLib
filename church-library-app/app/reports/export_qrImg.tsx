import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Alert,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Modal,
} from "react-native";
import QRCode from "react-native-qrcode-svg";
import * as FileSystem from "expo-file-system/legacy";
import * as MediaLibrary from "expo-media-library";
import { Feather } from "@expo/vector-icons";
import JSZip from "jszip";

import * as Sharing from 'expo-sharing';
import { captureRef } from "react-native-view-shot";

import { getAllAsync } from "../../db/sqlite";

type BookRow = {
  id: number;
  title: string;
  book_code: string;
};

export default function ExportQrImages() {
  const [books, setBooks] = useState<BookRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [exportProgress, setExportProgress] = useState({
    visible: false,
    current: 0,
    total: 0,
    step: "",
  });
  const qrRefs = useRef<Record<number, any>>({});
  
  useEffect(() => {
    loadBooks();
  }, []);

  const loadBooks = async () => {
    console.log("📚 Loading books for export...");
    try {
      const rows = await getAllAsync<BookRow>(
        `SELECT id, title, book_code FROM books ORDER BY title ASC`
      );
      console.log(`✅ Loaded ${rows.length} books`);
      setBooks(rows);
    } catch (err) {
      console.error("❌ Load books error:", err);
      Alert.alert("Error", "Failed to load books.");
    }
  };

  const sanitizeFileName = (name: string) => {
      return name.replace(/[\\/:*?"<>|]/g, "_").trim();
    };

  const updateProgress = (current: number, total: number, step: string) => {
    setExportProgress({
      visible: true,
      current,
      total,
      step,
    });
  };

  const exportAllQrs = async () => {
    if (books.length === 0) {
      Alert.alert("No Data", "No books found.");
      return;
    }

    console.log(`🚀 Starting export of ${books.length} books`);
    setLoading(true);
    updateProgress(0, books.length, "Preparing export...");

    try {
      // Step 1: Request permissions
      console.log("📱 Requesting storage permissions...");
      updateProgress(0, books.length, "Checking permissions...");
      
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission Required", "Storage permission is required.");
        setLoading(false);
        setExportProgress({ visible: false, current: 0, total: 0, step: "" });
        return;
      }

      console.log("✅ Permissions granted, creating ZIP...");
      
      // Step 2: Create ZIP
      const zip = new JSZip();
      const totalBooks = books.length;
      let processedBooks = 0;

      // Step 3: Process books in smaller batches to avoid memory issues
      const batchSize = 5; 
      for (let i = 0; i < totalBooks; i += batchSize) {
        const batch = books.slice(i, i + batchSize);
        console.log(`🔄 Processing batch ${Math.floor(i/batchSize) + 1} of ${Math.ceil(totalBooks/batchSize)}`);
        
        updateProgress(processedBooks, totalBooks, `Processing batch ${Math.floor(i/batchSize) + 1}...`);

        for (const book of batch) {
          try {
            console.log(`📖 Processing: ${book.title}`);
            updateProgress(processedBooks, totalBooks, `Processing: ${book.title.substring(0, 20)}...`);
            
            // 🛡️ SAFETY CHECK: If the ref is missing, wait briefly for the OS to render the component
            let ref = qrRefs.current[book.id];
            if (!ref) {
              await new Promise(resolve => setTimeout(resolve, 150)); // 150ms delay for UI thread
              ref = qrRefs.current[book.id];
            }

            if (!ref) {
              console.warn(`⚠️ QR View missing for: ${book.title} (ID: ${book.id})`);
              continue; 
            }

            // the SVG time to physically paint the pixels
            await new Promise(resolve => setTimeout(resolve, 50));

            // toDataURL
            /*const base64 = await new Promise<string>((resolve, reject) => {
              try {
                ref.toDataURL((data: string) => {
                  if (data) {
                    // Clean the prefix "data:image/png;base64," if the library adds it
                    const cleanBase64 = data.replace(/^data:image\/png;base64,/, "");
                    resolve(cleanBase64);
                  } else {
                    reject(new Error("QR generation returned empty data"));
                  }
                });
              } catch (error) {
                reject(error);
              }
            });

            */

            // captureRef that can "photograph" a whole group of components at once.
            const base64 = await captureRef(ref, {
              format: "png",
              quality: 1.0,
              result: "base64",
            });

            // Sanitized, preserves Amharic/Unicode characters
            const fileName = `${sanitizeFileName(book.title)}.png`;
            zip.file(fileName, base64, { base64: true });
            
            processedBooks++;
            updateProgress(processedBooks, totalBooks, `Added: ${book.title.substring(0, 20)}...`);
            
            // Tiny sleep to keep the UI responsive
            await new Promise(resolve => setTimeout(resolve, 15));
            
          } catch (bookError) {
            console.error(`❌ Error processing book ${book.title}:`, bookError);
          }
        }
        
        // Short pause between batches to allow the garbage collector to work
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // Step 4: Generate ZIP file
      console.log("📦 Generating ZIP file...");
      updateProgress(totalBooks, totalBooks, "Generating ZIP file...");
      
      const zipBase64 = await zip.generateAsync({ 
        type: "base64",
        compression: "DEFLATE",
        compressionOptions: {
          level: 6
        }
      });

      // Step 5: Save to file system
      console.log("💾 Saving ZIP file...");
      updateProgress(totalBooks, totalBooks, "Saving to storage...");
      
      const zipFileName = `fayda_qr_codes_${new Date().toISOString().split('T')[0]}.zip`;
      const zipPath = FileSystem.cacheDirectory + zipFileName;

      await FileSystem.writeAsStringAsync(zipPath, zipBase64, {
        encoding: FileSystem.EncodingType.Base64,
      });

      // Step 6: Save to Downloads using SAF
      console.log("📥 Saving to Downloads...");
      updateProgress(totalBooks, totalBooks, "Finalizing download...");
      
      try {
        // Request permission to a specific folder (the user picks 'Downloads' once)
        const permissions = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
        
        if (permissions.granted) {
          // Read the ZIP file you just created in cache as Base64
          const base64Data = await FileSystem.readAsStringAsync(zipPath, {
            encoding: FileSystem.EncodingType.Base64,
          });
      
          // Create the file in the directory the user selected
          const fileUri = await FileSystem.StorageAccessFramework.createFileAsync(
            permissions.directoryUri,
            zipFileName,
            'application/zip'
          );
      
          // Write the data to the new file
          await FileSystem.writeAsStringAsync(fileUri, base64Data, {
            encoding: FileSystem.EncodingType.Base64,
          });
      
          console.log("✅ File saved to Downloads successfully!");
        } else {
          // Fallback: If they cancel the folder picker, use the Share sheet so the file isn't lost 
          await Sharing.shareAsync(zipPath);
        }
      } catch (safError) {
        console.error("SAF Error:", safError);
        // Emergency fallback to Sharing if SAF fails
        await Sharing.shareAsync(zipPath);
      }
      
      // Step 7: Clean up cache
      console.log("🧹 Cleaning up...");
      await FileSystem.deleteAsync(zipPath).catch(() => {});

      console.log("✅ Export completed successfully!");
      
      Alert.alert(
        "Success", 
        `QR codes exported successfully!\n\nSaved: ${zipFileName}\nTotal books: ${processedBooks}/${totalBooks}`
      );
      
    } catch (err: any) {
      console.error("❌ Export error:", err);
      Alert.alert(
        "Error", 
        `Failed to export QR codes:\n\n${err.message || "Unknown error"}`
      );
    } finally {
      setLoading(false);
      setTimeout(() => {
        setExportProgress({ visible: false, current: 0, total: 0, step: "" });
      }, 500);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Export Book QR Codes</Text>
      <Text style={styles.subtitle}>
        Export all book QR images as a ZIP file
      </Text>

      {books.length > 0 && (
        <View style={styles.infoBox}>
          <Feather name="info" size={16} color="#005B82" />
          <Text style={styles.infoText}>
            Found {books.length} books. Each QR code will be saved as a PNG file in the ZIP.
          </Text>
        </View>
      )}

      <TouchableOpacity
        style={[styles.exportButton, loading && styles.exportButtonDisabled]}
        onPress={exportAllQrs}
        disabled={loading || books.length === 0}
      >
        {loading ? (
          <ActivityIndicator color="#FFF" />
        ) : (
          <>
            <Feather name="archive" size={20} color="#FFF" />
            <Text style={styles.exportText}>
              {books.length === 0 ? "No Books" : `Export ZIP (${books.length})`}
            </Text>
          </>
        )}
      </TouchableOpacity>

      {/* Progress Modal */}
      <Modal
        visible={exportProgress.visible}
        transparent
        animationType="fade"
        onRequestClose={() => {}}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Exporting QR Codes</Text>
            
            <View style={styles.progressContainer}>
              <View style={styles.progressBar}>
                <View 
                  style={[
                    styles.progressFill,
                    { 
                      width: `${exportProgress.total > 0 
                        ? (exportProgress.current / exportProgress.total) * 100 
                        : 0}%` 
                    }
                  ]} 
                />
              </View>
              <Text style={styles.progressText}>
                {exportProgress.current} / {exportProgress.total} books
              </Text>
            </View>
            
            <Text style={styles.stepText}>{exportProgress.step}</Text>
            
            <View style={styles.modalStats}>
              <View style={styles.statItem}>
                <Feather name="book" size={16} color="#005B82" />
                <Text style={styles.statText}>Total: {exportProgress.total}</Text>
              </View>
              <View style={styles.statItem}>
                <Feather name="check-circle" size={16} color="#27AE60" />
                <Text style={styles.statText}>Processed: {exportProgress.current}</Text>
              </View>
            </View>
            
            <ActivityIndicator size="large" color="#003153" style={styles.modalSpinner} />
          </View>
        </View>
      </Modal>

      {/* Hidden QR render zone Wraps QR + Text together */}
      <View style={styles.hiddenQrZone} pointerEvents="none">
        {books.map((book) => (
          <View
            key={book.id}
            ref={(el) => (qrRefs.current[book.id] = el)}
            collapsable={false}
            style={styles.qrCaptureContainer}
          >
            <QRCode value={book.book_code} size={250} />
            <Text style={styles.qrLabelText}>{book.title}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FDFBF7",
    padding: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: "#003153",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: "#7F8C8D",
    marginBottom: 24,
  },
  infoBox: {
    flexDirection: "row",
    backgroundColor: "#F0F7FF",
    padding: 16,
    borderRadius: 12,
    alignItems: "flex-start",
    marginBottom: 20,
    gap: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: "#005B82",
    lineHeight: 20,
  },
  exportButton: {
    flexDirection: "row",
    backgroundColor: "#003153",
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    shadowColor: "#003153",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  exportButtonDisabled: {
    backgroundColor: "#7F8C8D",
    opacity: 0.7,
  },
  exportText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  // The Secret Sauce
  // The Secret Sauce
  hiddenQrZone: {
    position: "absolute",
    top: 0,
    left: 0,
    zIndex: -100, // Put it behind the main app background
    opacity: 0.01,
  },
  qrCaptureContainer: {
    backgroundColor: "white",
    padding: 20,
    alignItems: "center",
    justifyContent: "center",
    width: 320, 
    minHeight: 350, // minHeight to guarantee bounds before capture
  },
  qrLabelText: {
    marginTop: 15,
    fontSize: 18,
    fontWeight: "bold",
    color: "black",
    textAlign: "center",
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 24,
    width: "100%",
    maxWidth: 320,
    alignItems: "center",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#003153",
    marginBottom: 20,
    textAlign: "center",
  },
  progressContainer: {
    width: "100%",
    marginBottom: 16,
  },
  progressBar: {
    height: 8,
    backgroundColor: "#F0F0F0",
    borderRadius: 4,
    overflow: "hidden",
    marginBottom: 8,
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#27AE60",
    borderRadius: 4,
  },
  progressText: {
    fontSize: 14,
    color: "#7F8C8D",
    textAlign: "center",
  },
  stepText: {
    fontSize: 16,
    color: "#003153",
    textAlign: "center",
    marginBottom: 20,
    fontWeight: "500",
  },
  modalStats: {
    flexDirection: "row",
    justifyContent: "space-around",
    width: "100%",
    marginBottom: 20,
  },
  statItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  statText: {
    fontSize: 14,
    color: "#005B82",
    fontWeight: "500",
  },
  modalSpinner: {
    marginTop: 10,
  },
});
