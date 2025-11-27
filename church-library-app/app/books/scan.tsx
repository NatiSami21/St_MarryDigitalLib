// app/books/scan.tsx
import React, { useState } from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { useRouter } from "expo-router";

export default function ScanBook() {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const router = useRouter();

  if (!permission?.granted) {
    return (
      <View style={{ padding: 20 }}>
        <TouchableOpacity
          onPress={requestPermission}
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

  return (
    <View style={{ flex: 1 }}>
      <CameraView
        style={{ flex: 1 }}
        barcodeScannerSettings={{
          barcodeTypes: ["qr", "code128", "ean13", "ean8"],
        }}
        onBarcodeScanned={(result) => {
          if (scanned) return;
          setScanned(true);

          const code = result.data;

          router.replace({
            pathname: "/borrow",
            params: {
              book_code: code,
              scan_id: Date.now(), // 🔥 Unique scan event
            },
          });
        }}
      />

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
        <Text style={{ color: "white", fontSize: 16 }}>Scan Book QR</Text>
      </View>
    </View>
  );
}
