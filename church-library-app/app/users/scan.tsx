// app/users/scan.tsx
import React, { useState } from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { useRouter, useLocalSearchParams } from "expo-router";

export default function ScanFayda() {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);

  const router = useRouter();
  const params = useLocalSearchParams();

  // 🔑 Default fallback keeps borrow flow intact
  const returnTo =
    typeof params.returnTo === "string" ? params.returnTo : "/borrow";

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
          const id = result.data;

          // ✅ Return scanned Fayda ID to caller
          router.replace({
            pathname: returnTo as any,
            params: {
              fayda: id,
              scan_id: Date.now(), // ensures rerender
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
        <Text style={{ color: "white", fontSize: 16 }}>
          Scan Fayda / ID
        </Text>
      </View>
    </View>
  );
}
