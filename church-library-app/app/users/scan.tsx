// app/users/scan.tsx
import React, { useState } from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { useRouter } from "expo-router";

export default function ScanFayda() {
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
          barcodeTypes: ["qr", "ean13", "ean8", "code128"],
        }}
        onBarcodeScanned={(result) => {
          if (!scanned) {
            setScanned(true);
            const code = result.data;

            router.push({
              pathname: "/users/register",
              params: { fayda: code },
            });
          }
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
          Scan Fayda / ID Barcode
        </Text>
      </View>
    </View>
  );
}
