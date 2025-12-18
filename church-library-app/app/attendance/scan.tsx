import React, { useState, useRef } from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { useRouter, useLocalSearchParams } from "expo-router";

import { Alert } from 'react-native';


// Helper to parse scanned books
function parseScannedBooks(encodedBooks: string): string[] {
  try {
    if (encodedBooks) {
      return JSON.parse(decodeURIComponent(encodedBooks)) || [];
    }
    return [];
  } catch (e) {
    console.error("Error parsing scanned books:", e);
    return [];
  }
}

export default function ScanAttendanceBook() {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const router = useRouter();
  const params = useLocalSearchParams();
  const lastScanTimeRef = useRef(0);

  console.log("📷 ScanAttendanceBook component rendered");
  console.log("📷 Params:", params);

  const currentScannedBooks = parseScannedBooks(params.current_scanned_books as string || '');
  console.log("📷 Current scanned books from params:", currentScannedBooks);

  if (!permission) {
    console.log("📷 Permission not loaded yet");
    return null;
  }

  if (!permission.granted) {
    console.log("📷 Permission not granted");
    return (
      <View style={{ padding: 20 }}>
        <TouchableOpacity
          onPress={() => {
            console.log("📷 Requesting camera permission");
            requestPermission();
          }}
          style={{
            backgroundColor: "#2563eb",
            padding: 15,
            borderRadius: 10,
          }}
        >
          <Text style={{ color: "white", textAlign: "center" }}>
            Grant Camera Permission
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  console.log("📷 Camera permission granted, rendering camera");

  const handleBarcodeScanned = (result: { data: string }) => {
    const now = Date.now();
    const timeSinceLastScan = now - lastScanTimeRef.current;
    
    console.log("📷 Barcode scanned:", result.data);
    console.log("📷 Time since last scan:", timeSinceLastScan, "ms");
    console.log("📷 Already scanned:", scanned);

    if (scanned) {
      console.log("⚠️ Already processing scan, ignoring");
      return;
    }

    // Prevent multiple scans within 1 second
    if (timeSinceLastScan < 1000) {
      console.log("⚠️ Too soon since last scan, ignoring");
      return;
    }

    setScanned(true);
    lastScanTimeRef.current = now;
    const book_code = result.data;

    console.log("📷 Current scanned books before update:", currentScannedBooks);
    
    // Check if this is a duplicate
    if (currentScannedBooks.includes(book_code)) {
      console.log("❌ Duplicate book in current list");
      Alert.alert("Duplicate", "This book was already scanned.");
      setTimeout(() => setScanned(false), 1000);
      return;
    }

    // Add new book to the list
    const updatedBooks = [...currentScannedBooks, book_code];
    const encodedUpdatedBooks = encodeURIComponent(JSON.stringify(updatedBooks));
    
    console.log("📷 Updated books list:", updatedBooks);
    console.log("📷 Navigating back with updated list");

    // Go back to verify screen with updated books
    router.replace({
      pathname: "/attendance/verify",
      params: {
        scanned_books: encodedUpdatedBooks,
        book_code: book_code,
        scan_id: Date.now().toString(),
      },
    });
  };

  return (
    <View style={{ flex: 1 }}>
      <CameraView
        style={{ flex: 1 }}
        barcodeScannerSettings={{
          barcodeTypes: ["qr", "code128", "ean13", "ean8"],
        }}
        onBarcodeScanned={handleBarcodeScanned}
      />

      <TouchableOpacity
        onPress={() => {
          console.log("📷 Back button pressed");
          // Go back with current scanned books preserved
          router.replace({
            pathname: "/attendance/verify",
            params: {
              scanned_books: params.current_scanned_books,
              timestamp: Date.now().toString(),
            },
          });
        }}
        style={{
          position: "absolute",
          top: 40,
          left: 20,
          backgroundColor: "rgba(0,0,0,0.6)",
          padding: 12,
          borderRadius: 10,
        }}
      >
        <Text style={{ color: "white", fontSize: 16 }}>← Back</Text>
      </TouchableOpacity>

      <View
        style={{
          position: "absolute",
          bottom: 40,
          alignSelf: "center",
          backgroundColor: "rgba(0,0,0,0.6)",
          padding: 12,
          borderRadius: 10,
        }}
      >
        <Text style={{ color: "white", fontSize: 16 }}>
          Scan Book for Attendance
        </Text>
        <Text style={{ color: "white", fontSize: 12, textAlign: 'center', marginTop: 4 }}>
          {scanned ? "Processing..." : "Ready to scan"}
        </Text>
        <Text style={{ color: "white", fontSize: 10, textAlign: 'center', marginTop: 2 }}>
          Current: {currentScannedBooks.length} books
        </Text>
      </View>
    </View>
  );
}