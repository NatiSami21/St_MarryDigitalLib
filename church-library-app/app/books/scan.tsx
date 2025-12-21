// church-library-app/app/books/scan.tsx
import React, { useState } from "react";
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet, 
  StatusBar,
  Dimensions,
  Platform 
} from "react-native";
import { CameraView, useCameraPermissions,FlashMode } from "expo-camera";
import { useRouter } from "expo-router";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons, Feather } from "@expo/vector-icons"; 
import * as Haptics from 'expo-haptics';

import { ActivityIndicator, Alert } from "react-native";

const { width, height } = Dimensions.get("window");

export default function ScanBook() {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [flashOn, setFlashOn] = useState(false);
  const router = useRouter();
  const insets = useSafeAreaInsets();

  if (!permission) {
    return (
      <View style={styles.container}>
        <StatusBar backgroundColor="#003153" barStyle="light-content" />
        <ActivityIndicator size="large" color="#FFFFFF" />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.permissionContainer}>
        <StatusBar backgroundColor="#FDFBF7" barStyle="dark-content" />
        
        <View style={styles.permissionContent}>
          <View style={styles.permissionIcon}>
            <Feather name="camera-off" size={64} color="#003153" />
          </View>
          
          <Text style={styles.permissionTitle}>Camera Access Required</Text>
          <Text style={styles.permissionSubtitle}>
            To scan book QR codes, FAYDA Library needs access to your camera.
          </Text>
          
          <TouchableOpacity
            style={styles.permissionButton}
            onPress={requestPermission}
          >
            <Feather name="camera" size={24} color="#FFFFFF" />
            <Text style={styles.permissionButtonText}>Grant Camera Permission</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={20} color="#003153" />
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const handleBarcodeScanned = (result: any) => {
    if (scanned) return;
    setScanned(true);

    const code = result.data;
    
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)

    setTimeout(() => {
      router.replace({
        pathname: "/borrow",
        params: {
          book_code: code,
          scan_id: Date.now(),
        },
      });
    }, 500);
  };

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor="#000000" barStyle="light-content" />
      
      <CameraView
        style={StyleSheet.absoluteFill}
        barcodeScannerSettings={{
          barcodeTypes: ["qr", "code128", "ean13", "ean8", "upc_e"],
        }}
        onBarcodeScanned={handleBarcodeScanned}
        //flash={(flashOn ? "torch" : "off") as FlashMode}
      />
      
      {/* Overlay */}
      <View style={styles.overlay}>
        {/* Top Bar */}
        <SafeAreaView style={[styles.topBar, { paddingTop: insets.top }]} edges={['top']}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.closeButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="close" size={28} color="#FFFFFF" />
          </TouchableOpacity>
          
          <Text style={styles.title}>Scan Book QR Code</Text>
          
          <TouchableOpacity
            onPress={() => setFlashOn(!flashOn)}
            style={styles.flashButton}
          >
            <Feather 
              name={flashOn ? "zap" : "zap-off"} 
              size={24} 
              color={flashOn ? "#FFD700" : "#FFFFFF"} 
            />
          </TouchableOpacity>
        </SafeAreaView>
        
        {/* Scan Area */}
        <View style={styles.scanAreaContainer}>
          <View style={styles.scanArea}>
            <View style={styles.cornerTL} />
            <View style={styles.cornerTR} />
            <View style={styles.cornerBL} />
            <View style={styles.cornerBR} />
          </View>
          
          <Text style={styles.scanInstruction}>
            Align the QR code within the frame
          </Text>
        </View>
        
        {/* Bottom Bar */}
        <SafeAreaView style={[styles.bottomBar, { paddingBottom: insets.bottom }]} edges={['bottom']}>
          <TouchableOpacity
            style={styles.manualButton}
            onPress={() => router.push("/books/list")}
          >
            <Feather name="search" size={20} color="#003153" />
            <Text style={styles.manualButtonText}>Search Manually</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.infoButton}
            onPress={() => {
              Alert.alert(
                "Scan Tips",
                "• Ensure good lighting\n• Keep the QR code steady\n• Center the code in the frame\n• Make sure the code is not blurry"
              );
            }}
          >
            <Feather name="info" size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </SafeAreaView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000000",
  },
  permissionContainer: {
    flex: 1,
    backgroundColor: "#FDFBF7",
  },
  permissionContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
  },
  permissionIcon: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "#F0F7FF",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 32,
  },
  permissionTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#003153",
    textAlign: "center",
    marginBottom: 12,
  },
  permissionSubtitle: {
    fontSize: 16,
    color: "#7F8C8D",
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 40,
  },
  permissionButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#003153",
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
    gap: 12,
    marginBottom: 20,
    shadowColor: "#003153",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  permissionButtonText: {
    fontSize: 18,
    color: "#FFFFFF",
    fontWeight: "600",
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: "#F0F7FF",
    borderWidth: 1,
    borderColor: "#E5E0D5",
    gap: 8,
  },
  backButtonText: {
    fontSize: 16,
    color: "#003153",
    fontWeight: "500",
  },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.4)",
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: "rgba(0, 49, 83, 0.8)",
  },
  closeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    fontSize: 18,
    fontWeight: "600",
    color: "#FFFFFF",
    textAlign: "center",
    flex: 1,
  },
  flashButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    justifyContent: "center",
    alignItems: "center",
  },
  scanAreaContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
  },
  scanArea: {
    width: width * 0.7,
    height: width * 0.7,
    borderWidth: 2,
    borderColor: "rgba(255, 255, 255, 0.3)",
    borderRadius: 20,
    position: "relative",
  },
  cornerTL: {
    position: "absolute",
    top: 0,
    left: 0,
    width: 40,
    height: 40,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderColor: "#D4AF37",
    borderTopLeftRadius: 10,
  },
  cornerTR: {
    position: "absolute",
    top: 0,
    right: 0,
    width: 40,
    height: 40,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderColor: "#D4AF37",
    borderTopRightRadius: 10,
  },
  cornerBL: {
    position: "absolute",
    bottom: 0,
    left: 0,
    width: 40,
    height: 40,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderColor: "#D4AF37",
    borderBottomLeftRadius: 10,
  },
  cornerBR: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 40,
    height: 40,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderColor: "#D4AF37",
    borderBottomRightRadius: 10,
  },
  scanInstruction: {
    fontSize: 16,
    color: "#FFFFFF",
    textAlign: "center",
    marginTop: 32,
    backgroundColor: "rgba(0, 49, 83, 0.8)",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    fontWeight: "500",
  },
  bottomBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 20,
    backgroundColor: "rgba(0, 49, 83, 0.8)",
  },
  manualButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  manualButtonText: {
    fontSize: 16,
    color: "#003153",
    fontWeight: "600",
  },
  infoButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
});
 