// app/borrow/scan-book.tsx
import { useState } from "react";
import { View, Text, TouchableOpacity, Vibration } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { useRouter } from "expo-router";

export default function ScanBook() {
  const [permission, requestPermission] = useCameraPermissions();
  const [scannedCode, setScannedCode] = useState<string | null>(null);
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

  const handleScan = (data: string) => {
    if (scannedCode) return;

    setScannedCode(data);
    Vibration.vibrate(120); // 🔥 Added vibration
  };

  return (
    <View style={{ flex: 1 }}>
      {!scannedCode ? (
        <CameraView
          style={{ flex: 1 }}
          barcodeScannerSettings={{ barcodeTypes: ["qr", "code128"] }}
          onBarcodeScanned={(result) => handleScan(result.data)}
        />
      ) : (
        <View
          style={{
            flex: 1,
            backgroundColor: "#0f172a",
            justifyContent: "center",
            alignItems: "center",
            padding: 20,
          }}
        >
          <Text
            style={{
              color: "white",
              fontSize: 24,
              marginBottom: 20,
              fontWeight: "700",
            }}
          >
            Book Scanned!
          </Text>

          <Text style={{ color: "#bae6fd", marginBottom: 30, fontSize: 18 }}>
            Code: {scannedCode}
          </Text>

          <TouchableOpacity
            onPress={() =>
              router.replace({
                pathname: "/borrow/scan-user",
                params: { book_code: scannedCode },
              })
            }
            style={{
              backgroundColor: "#1e40af",
              padding: 15,
              borderRadius: 12,
              minWidth: 180,
            }}
          >
            <Text
              style={{
                color: "white",
                fontSize: 18,
                textAlign: "center",
                fontWeight: "700",
              }}
            >
              Next →
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {!scannedCode && (
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
            Scan Book QR Code
          </Text>
        </View>
      )}
    </View>
  );
}
