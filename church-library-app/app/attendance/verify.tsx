import React, { useEffect, useState, useRef, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";

import { getActiveShift } from "../../utils/shift";
import { getBook } from "../../db/books";
import { getSession, clearSession } from "../../lib/session";
import { isInsideShift } from "../../utils/shift";
import { implicitClockIn } from "../../db/queries/attendance";

/* ---------------------------------------------
 * ENV CONFIG
 * --------------------------------------------- */
const HIGH_ATTENDANCE_VERIFICATION =
  process.env.EXPO_PUBLIC_HIGH_ATTENDANCE_VERIFICATION === "true";

const NUMBER_OF_BOOKS_TO_SCAN = parseInt(
  process.env.EXPO_PUBLIC_NUMBER_OF_BOOKS_TO_SCAN || "3",
  10
);

// Helper to parse scanned books from URL
function parseScannedBooksFromParams(params: any): string[] {
  try {
    if (typeof params.scanned_books === 'string') {
      return JSON.parse(decodeURIComponent(params.scanned_books)) || [];
    }
    return [];
  } catch (e) {
    console.error("Error parsing scanned books:", e);
    return [];
  }
}

export default function AttendanceVerify() {
  const router = useRouter();
  const params = useLocalSearchParams();

  const [scannedBooks, setScannedBooks] = useState<string[]>(() => 
    parseScannedBooksFromParams(params)
  );
  const [processing, setProcessing] = useState(false);
  const [checkingShift, setCheckingShift] = useState(true);
  const [attendanceConfirmed, setAttendanceConfirmed] = useState(false);
  
  const componentMountedRef = useRef(true);
  const lastScanIdRef = useRef<string>('');
  const attendanceCheckRef = useRef(false); // Prevent multiple confirmations

  console.log("🔄 AttendanceVerify component RENDERED");
  console.log("🔄 scannedBooks:", scannedBooks);
  console.log("🔄 scannedBooks.length:", scannedBooks.length);
  console.log("🔄 NUMBER_OF_BOOKS_TO_SCAN:", NUMBER_OF_BOOKS_TO_SCAN);
  console.log("🔄 attendanceConfirmed:", attendanceConfirmed);

  /* ---------------------------------------------
   * Component lifecycle logging
   * --------------------------------------------- */
  useEffect(() => {
    console.log("🚀 AttendanceVerify component MOUNTED");
    componentMountedRef.current = true;
    attendanceCheckRef.current = false;
    
    return () => {
      console.log("💀 AttendanceVerify component UNMOUNTED");
      componentMountedRef.current = false;
    };
  }, []);

  /* ---------------------------------------------
   * Check if we should auto-confirm attendance
   * This runs when scannedBooks changes
   * --------------------------------------------- */
  useEffect(() => {
    console.log("🔍 Checking if should auto-confirm...");
    console.log("🔍 scannedBooks.length:", scannedBooks.length);
    console.log("🔍 NUMBER_OF_BOOKS_TO_SCAN:", NUMBER_OF_BOOKS_TO_SCAN);
    console.log("🔍 processing:", processing);
    console.log("🔍 attendanceCheckRef.current:", attendanceCheckRef.current);
    
    if (
      scannedBooks.length >= NUMBER_OF_BOOKS_TO_SCAN &&
      !processing &&
      !attendanceCheckRef.current &&
      componentMountedRef.current
    ) {
      console.log("✅ Conditions met for auto-confirmation!");
      attendanceCheckRef.current = true;
      
      // Small delay to ensure state is settled
      setTimeout(() => {
        confirmAttendance();
      }, 300);
    } else if (scannedBooks.length < NUMBER_OF_BOOKS_TO_SCAN) {
      // Reset if books are removed (for debugging)
      attendanceCheckRef.current = false;
    }
  }, [scannedBooks, processing]);

  /* ---------------------------------------------
   * Update URL with current scanned books
   * This keeps state in the URL
   * --------------------------------------------- */
  useEffect(() => {
    if (scannedBooks.length > 0 && !attendanceConfirmed) {
      // Update URL with current scanned books
      const encodedBooks = encodeURIComponent(JSON.stringify(scannedBooks));
      router.setParams({
        scanned_books: encodedBooks,
        // Keep other params
        ...(params.book_code && { book_code: params.book_code }),
        ...(params.scan_id && { scan_id: params.scan_id }),
      });
      console.log("📝 Updated URL with scanned books:", scannedBooks);
    }
  }, [scannedBooks, attendanceConfirmed]);

  /* ---------------------------------------------
   * Guard: must be librarian + inside shift
   * --------------------------------------------- */
  useEffect(() => {
    async function guard() {
      console.log("🛡️ Running guard function");
      
      const session = await getSession();
      console.log("🛡️ Session:", session);

      if (!session || session.role !== "librarian") {
        console.log("❌ No session or not librarian");
        await clearSession();
        router.replace("/auth/login");
        return;
      }

      console.log("🛡️ Checking shift for user:", session.username);
      const allowed = await isInsideShift(session.username);
      console.log("🛡️ Shift allowed:", allowed);

      if (!allowed) {
        Alert.alert(
          "Shift Ended",
          "❌ Your shift ended before attendance verification."
        );
        await clearSession();
        router.replace("/auth/login");
        return;
      }

      if (componentMountedRef.current) {
        setCheckingShift(false);
        console.log("✅ Guard passed, checkingShift set to false");
      }
    }

    guard();
  }, []);

  /* ---------------------------------------------
   * Handle scanned book from scanner screen
   * --------------------------------------------- */
  useEffect(() => {
    const book_code = params.book_code;
    const scan_id = params.scan_id;
    
    console.log("📥 PARAMS EFFECT TRIGGERED");
    console.log("📥 book_code param:", book_code);
    console.log("📥 scan_id param:", scan_id);
    console.log("📥 Last scan ID:", lastScanIdRef.current);
    console.log("📥 attendanceConfirmed:", attendanceConfirmed);

    if (
      typeof book_code === "string" && 
      book_code.trim() !== "" &&
      !processing &&
      !attendanceConfirmed &&
      componentMountedRef.current
    ) {
      // Check if this is a new scan (different scan_id)
      if (scan_id !== lastScanIdRef.current) {
        console.log("✅ New scan detected, calling handleScan");
        lastScanIdRef.current = scan_id as string;
        handleScan(book_code);
      } else {
        console.log("⚠️ Duplicate scan_id, ignoring");
      }
    }
  }, [params.book_code, params.scan_id, processing, attendanceConfirmed]);

  /* ---------------------------------------------
   * Scan handler
   * --------------------------------------------- */
  const handleScan = useCallback(async (book_code: string) => {
    console.log("🔍 HANDLE SCAN called with book_code:", book_code);
    
    if (processing) {
      console.log("⚠️ Processing, ignoring scan");
      return;
    }

    if (attendanceConfirmed) {
      console.log("⚠️ Attendance already confirmed, ignoring scan");
      return;
    }

    if (!componentMountedRef.current) {
      console.log("⚠️ Component not mounted, ignoring scan");
      return;
    }

    console.log("🔍 Validating book exists...");
    const book = await getBook(book_code);
    if (!book) {
      Alert.alert("Invalid Book", "Book not found in local library.");
      console.log("❌ Book not found in local library");
      return;
    }

    console.log("🔍 Checking for duplicate...");
    if (scannedBooks.includes(book_code)) {
      Alert.alert("Duplicate Scan", "This book was already scanned.");
      console.log("❌ Duplicate book detected");
      return;
    }

    console.log("🔍 Adding new book to list");
    const updatedBooks = [...scannedBooks, book_code];
    
    if (componentMountedRef.current) {
      setScannedBooks(updatedBooks);
      console.log("✅ Updated scanned books:", updatedBooks);
    } else {
      console.log("⚠️ Component not mounted, not updating state");
    }
  }, [scannedBooks, processing, attendanceConfirmed]);

  /* ---------------------------------------------
   * Confirm attendance
   * --------------------------------------------- */
  const confirmAttendance = useCallback(async () => {
    console.log("✅ CONFIRM ATTENDANCE called");
    console.log("✅ Current scanned books count:", scannedBooks.length);
    
    if (processing) {
      console.log("⚠️ Already processing, skipping");
      return;
    }
    
    if (attendanceConfirmed) {
      console.log("⚠️ Attendance already confirmed, skipping");
      return;
    }
    
    if (!componentMountedRef.current) {
      console.log("⚠️ Component not mounted, skipping");
      return;
    }

    if (scannedBooks.length < NUMBER_OF_BOOKS_TO_SCAN) {
      console.log("⚠️ Not enough books scanned:", scannedBooks.length, "needed:", NUMBER_OF_BOOKS_TO_SCAN);
      return;
    }

    setProcessing(true);
    console.log("🔄 Processing started");

    try {
      const session = await getSession();
      console.log("🔑 Session:", session);
      
      if (!session) {
        throw new Error("Session lost");
      }

      const activeShift = await getActiveShift(session.username);
      console.log("🕐 Active shift:", activeShift);
      
      if (!activeShift) {
        Alert.alert("Shift Ended", "❌ Shift expired during verification.");
        await clearSession();
        router.replace("/auth/login");
        return;
      }

      console.log("⏰ Clocking in...");
      await implicitClockIn(
        activeShift.id,
        session.username,
        activeShift.startTs
      );

      // Mark attendance as confirmed
      setAttendanceConfirmed(true);
      
      // Show success alert
      Alert.alert(
        "Attendance Verified",
        "✅ Attendance successfully recorded.",
        [
          {
            text: "Continue",
            onPress: () => {
              console.log("🏁 Redirecting to home...");
              router.replace("/");
            }
          }
        ]
      );

      // Auto-redirect after alert
      setTimeout(() => {
        if (componentMountedRef.current) {
          console.log("🏁 Auto-redirecting to home...");
          router.replace("/");
        }
      }, 2000);
      
    } catch (e) {
      console.error("❌ Attendance verification failed", e);
      Alert.alert("Error", "Attendance verification failed.");
      await clearSession();
      router.replace("/auth/login");
    } finally {
      if (componentMountedRef.current) {
        setProcessing(false);
        console.log("🔄 Processing completed");
      }
    }
  }, [processing, attendanceConfirmed, scannedBooks.length]);

  /* ---------------------------------------------
   * Manual confirmation button handler
   * For when auto-confirmation doesn't work
   * --------------------------------------------- */
  const handleManualConfirm = useCallback(() => {
    console.log("🔄 Manual confirm button pressed");
    console.log("🔄 Current count:", scannedBooks.length, "/", NUMBER_OF_BOOKS_TO_SCAN);
    
    if (scannedBooks.length >= NUMBER_OF_BOOKS_TO_SCAN) {
      confirmAttendance();
    } else {
      Alert.alert(
        "Not Enough Books",
        `Please scan ${NUMBER_OF_BOOKS_TO_SCAN - scannedBooks.length} more book(s)`,
        [{ text: "OK" }]
      );
    }
  }, [scannedBooks.length, confirmAttendance]);

  /* ---------------------------------------------
   * Cancel / Logout
   * --------------------------------------------- */
  const cancelAndLogout = useCallback(async () => {
    console.log("🚪 Cancel & Logout called");
    await clearSession();
    router.replace("/auth/login");
  }, []);

  /* ---------------------------------------------
   * Manual scan button handler
   * Only works if not enough books scanned
   * --------------------------------------------- */
  const handleScanButtonPress = useCallback(() => {
    if (scannedBooks.length >= NUMBER_OF_BOOKS_TO_SCAN) {
      console.log("✅ Already have enough books, confirming instead of scanning");
      confirmAttendance();
      return;
    }
    
    console.log("📸 Scan button pressed");
    console.log("📸 Current scanned books to pass:", scannedBooks);
    
    // Pass current scanned books to scanner so it can pass them back
    const encodedBooks = encodeURIComponent(JSON.stringify(scannedBooks));
    
    router.push({
      pathname: "/attendance/scan",
      params: {
        current_scanned_books: encodedBooks,
        // Add a timestamp to force refresh
        timestamp: Date.now().toString()
      }
    });
  }, [scannedBooks, confirmAttendance]);

  /* ---------------------------------------------
   * UI
   * --------------------------------------------- */
  console.log("🎨 Rendering UI...");
  console.log("  - HIGH_ATTENDANCE_VERIFICATION:", HIGH_ATTENDANCE_VERIFICATION);
  console.log("  - checkingShift:", checkingShift);
  console.log("  - scannedBooks.length:", scannedBooks.length);
  console.log("  - attendanceConfirmed:", attendanceConfirmed);
  console.log("  - processing:", processing);

  if (!HIGH_ATTENDANCE_VERIFICATION) {
    console.log("⚙️ High attendance verification disabled");
    return (
      <View style={{ padding: 20 }}>
        <Text>Attendance verification disabled.</Text>
      </View>
    );
  }

  if (checkingShift) {
    console.log("⏳ Showing loading indicator");
    return <ActivityIndicator style={{ marginTop: 40 }} size="large" />;
  }

  console.log("🖥️ Rendering main UI");
  return (
    <View style={{ flex: 1, padding: 24, backgroundColor: "#f8fafc" }}>
      <Text
        style={{
          fontSize: 24,
          fontWeight: "800",
          color: "#1e3a8a",
          marginBottom: 10,
        }}
      >
        {attendanceConfirmed ? "✅ Attendance Verified" : "Attendance Verification"}
      </Text>

      <Text style={{ color: "#475569", marginBottom: 20 }}>
        {attendanceConfirmed 
          ? "Your attendance has been recorded successfully."
          : `Scan ${NUMBER_OF_BOOKS_TO_SCAN} different books to confirm attendance.`
        }
      </Text>

      <Text style={{ marginBottom: 12, fontSize: 18, fontWeight: 'bold' }}>
        {attendanceConfirmed 
          ? "✅ All books scanned"
          : `Scanned: ${scannedBooks.length}/${NUMBER_OF_BOOKS_TO_SCAN}`
        }
      </Text>

      {/* Debug info */}
      <View style={{ 
        backgroundColor: '#f3f4f6', 
        padding: 10, 
        borderRadius: 8,
        marginBottom: 20 
      }}>
        <Text style={{ fontSize: 12, color: '#6b7280' }}>
          Debug: {scannedBooks.length} books | Status: {attendanceConfirmed ? 'Confirmed' : 'Pending'} | Processing: {processing ? 'Yes' : 'No'}
        </Text>
        <Text style={{ fontSize: 10, color: '#9ca3af', marginTop: 4 }}>
          {scannedBooks.length > 0 ? `Books: ${scannedBooks.map(b => b.substring(0, 8)).join(', ')}...` : 'No books scanned'}
        </Text>
      </View>

      {/* Show scanned books list */}
      {scannedBooks.length > 0 && (
        <View style={{ marginBottom: 20 }}>
          <Text style={{ fontSize: 16, fontWeight: '600', marginBottom: 8 }}>
            Scanned Books:
          </Text>
          {scannedBooks.map((bookCode, index) => (
            <Text key={index} style={{ marginBottom: 4, color: '#4b5563' }}>
              {index + 1}. {bookCode.substring(0, 8)}...
            </Text>
          ))}
        </View>
      )}

      {/* Main Action Button */}
      <TouchableOpacity
        onPress={handleScanButtonPress}
        disabled={processing || attendanceConfirmed}
        style={{
          backgroundColor: attendanceConfirmed 
            ? "#10b981" 
            : scannedBooks.length >= NUMBER_OF_BOOKS_TO_SCAN 
              ? "#f59e0b" 
              : "#1e40af",
          padding: 14,
          borderRadius: 10,
          marginBottom: 12,
          opacity: (processing || attendanceConfirmed) ? 0.5 : 1,
        }}
      >
        <Text style={{ color: "white", textAlign: "center", fontWeight: "700" }}>
          {attendanceConfirmed 
            ? "✅ Verified" 
            : scannedBooks.length >= NUMBER_OF_BOOKS_TO_SCAN 
              ? processing ? "Processing..." : "✓ Confirm Attendance"
              : "Scan Book"
          }
        </Text>
      </TouchableOpacity>

      {/* Manual Confirm Button (only show if enough books but not auto-confirmed) */}
      {scannedBooks.length >= NUMBER_OF_BOOKS_TO_SCAN && !attendanceConfirmed && !processing && (
        <TouchableOpacity
          onPress={handleManualConfirm}
          style={{
            backgroundColor: "#8b5cf6",
            padding: 14,
            borderRadius: 10,
            marginBottom: 12,
          }}
        >
          <Text style={{ color: "white", textAlign: "center", fontWeight: "700" }}>
            Manual Confirm
          </Text>
        </TouchableOpacity>
      )}

      {/* Loading indicator */}
      {processing && (
        <View style={{ alignItems: 'center', marginBottom: 12 }}>
          <ActivityIndicator size="large" color="#1e40af" />
          <Text style={{ color: '#475569', marginTop: 8 }}>Recording attendance...</Text>
        </View>
      )}

      <TouchableOpacity
        onPress={cancelAndLogout}
        disabled={processing}
        style={{
          backgroundColor: "#dc2626",
          padding: 14,
          borderRadius: 10,
          opacity: processing ? 0.5 : 1,
          marginBottom: 10,
        }}
      >
        <Text style={{ color: "white", textAlign: "center" }}>
          Cancel & Logout
        </Text>
      </TouchableOpacity>

      {/* Reset button for testing */}
      <TouchableOpacity
        onPress={() => {
          console.log("🔄 Resetting scanned books");
          setScannedBooks([]);
          setAttendanceConfirmed(false);
          attendanceCheckRef.current = false;
        }}
        style={{
          backgroundColor: "#6b7280",
          padding: 10,
          borderRadius: 10,
        }}
      >
        <Text style={{ color: "white", textAlign: "center", fontSize: 12 }}>
          Reset (Debug)
        </Text>
      </TouchableOpacity>
    </View>
  );
}