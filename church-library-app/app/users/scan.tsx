// church-library-app/app/users/scan.tsx

import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Vibration,
} from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { useRouter, useLocalSearchParams } from "expo-router";
import Icon from 'react-native-vector-icons/Feather';
import { Theme } from "../../styles/theme";

export default function ScanFayda() {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [lastScannedCode, setLastScannedCode] = useState<string | null>(null);

  const router = useRouter();
  const params = useLocalSearchParams();

  // 🔑 Default fallback keeps borrow flow intact
  const returnTo =
    typeof params.returnTo === "string" ? params.returnTo : "/borrow";

  if (!permission?.granted) {
    return (
      <View style={styles.permissionContainer}>
        <Icon name="camera-off" size={64} color={Theme.colors.textLight} style={styles.permissionIcon} />
        <Text style={styles.permissionTitle}>Camera Access Required</Text>
        <Text style={styles.permissionText}>
          To scan Fayda ID cards, we need access to your camera
        </Text>
        <TouchableOpacity
          onPress={requestPermission}
          style={styles.primaryButton}
        >
          <Icon name="camera" size={20} color={Theme.colors.white} style={{ marginRight: Theme.spacing.sm }} />
          <Text style={styles.primaryButtonText}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const handleBarcodeScanned = (result: any) => {
    if (scanned) return;

    const id = result.data;
    setLastScannedCode(id);
    setScanned(true);
    Vibration.vibrate(120);

    // Navigate after a brief delay to show feedback
    setTimeout(() => {
      router.replace({
        pathname: returnTo as any,
        params: {
          fayda: id,
          scan_id: Date.now(), // ensures rerender
        },
      });
    }, 500);
  };

  const handleRescan = () => {
    setScanned(false);
    setLastScannedCode(null);
  };

  return (
    <View style={styles.container}>
      {!scanned ? (
        <>
          <CameraView
            style={styles.camera}
            barcodeScannerSettings={{
              barcodeTypes: ["qr", "code128", "ean13", "ean8"],
            }}
            onBarcodeScanned={handleBarcodeScanned}
          />
          
          <View style={styles.scannerOverlay}>
            <View style={styles.scannerFrame} />
            <Text style={styles.scannerText}>Align Fayda ID within frame</Text>
          </View>
          
          <View style={styles.header}>
            <TouchableOpacity
              onPress={() => router.back()}
              style={styles.backButton}
            >
              <Icon name="arrow-left" size={24} color={Theme.colors.white} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Scan Fayda ID</Text>
          </View>
        </>
      ) : (
        <View style={styles.successContainer}>
          <View style={styles.successIconContainer}>
            <Icon name="check-circle" size={80} color={Theme.colors.success} />
          </View>
          
          <Text style={styles.successTitle}>Fayda ID Scanned!</Text>
          <Text style={styles.successSubtitle}>Scanned Code</Text>
          
          <View style={styles.codeContainer}>
            <Icon name="hash" size={20} color={Theme.colors.teal} />
            <Text style={styles.codeText}>{lastScannedCode}</Text>
          </View>

          <Text style={styles.instructionText}>
            Redirecting to {returnTo === "/users/register" ? "User Registration" : "Borrow Process"}...
          </Text>

          <View style={styles.buttonContainer}>
            <TouchableOpacity
              onPress={handleRescan}
              style={styles.secondaryButton}
            >
              <Icon name="rotate-ccw" size={20} color={Theme.colors.teal} />
              <Text style={styles.secondaryButtonText}>Rescan</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              onPress={() => {
                router.replace({
                  pathname: returnTo as any,
                  params: {
                    fayda: lastScannedCode,
                    scan_id: Date.now(),
                  },
                });
              }}
              style={styles.primaryButton}
            >
              <Text style={styles.primaryButtonText}>Continue</Text>
              <Icon name="chevron-right" size={20} color={Theme.colors.white} />
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Theme.colors.teal,
  },
  permissionContainer: {
    flex: 1,
    backgroundColor: Theme.colors.cream,
    padding: Theme.spacing.xl,
    justifyContent: 'center',
    alignItems: 'center',
  },
  permissionIcon: {
    marginBottom: Theme.spacing.lg,
  },
  permissionTitle: {
    ...Theme.typography.h2,
    color: Theme.colors.teal,
    textAlign: 'center',
    marginBottom: Theme.spacing.sm,
  },
  permissionText: {
    ...Theme.typography.body,
    color: Theme.colors.textLight,
    textAlign: 'center',
    marginBottom: Theme.spacing.xl,
    maxWidth: '80%',
  },
  camera: {
    flex: 1,
  },
  scannerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  scannerFrame: {
    width: 250,
    height: 250,
    borderWidth: 2,
    borderColor: Theme.colors.white,
    borderRadius: Theme.radius.md,
    backgroundColor: 'transparent',
  },
  scannerText: {
    color: Theme.colors.white,
    fontSize: 16,
    marginTop: Theme.spacing.xl,
    backgroundColor: 'rgba(0, 91, 130, 0.7)',
    paddingHorizontal: Theme.spacing.md,
    paddingVertical: Theme.spacing.sm,
    borderRadius: Theme.radius.sm,
  },
  header: {
    position: 'absolute',
    top: 40,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Theme.spacing.md,
  },
  backButton: {
    padding: Theme.spacing.sm,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: Theme.radius.sm,
    marginRight: Theme.spacing.sm,
  },
  headerTitle: {
    color: Theme.colors.white,
    fontSize: 18,
    fontWeight: '600',
  },
  successContainer: {
    flex: 1,
    backgroundColor: Theme.colors.cream,
    padding: Theme.spacing.xl,
    justifyContent: 'center',
    alignItems: 'center',
  },
  successIconContainer: {
    marginBottom: Theme.spacing.xl,
  },
  successTitle: {
    ...Theme.typography.h2,
    color: Theme.colors.teal,
    textAlign: 'center',
    marginBottom: Theme.spacing.md,
  },
  successSubtitle: {
    ...Theme.typography.body,
    color: Theme.colors.textLight,
    marginBottom: Theme.spacing.sm,
  },
  codeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Theme.colors.white,
    padding: Theme.spacing.lg,
    borderRadius: Theme.radius.md,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    marginBottom: Theme.spacing.xl,
    width: '80%',
  },
  codeText: {
    ...Theme.typography.h3,
    color: Theme.colors.teal,
    marginLeft: Theme.spacing.sm,
    fontFamily: 'monospace',
    flex: 1,
  },
  instructionText: {
    ...Theme.typography.body,
    color: Theme.colors.textLight,
    textAlign: 'center',
    marginBottom: Theme.spacing.xl,
    maxWidth: '80%',
  },
  buttonContainer: {
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'space-between',
  },
  primaryButton: {
    backgroundColor: Theme.colors.teal,
    borderRadius: Theme.radius.md,
    paddingVertical: Theme.spacing.lg,
    paddingHorizontal: Theme.spacing.xl,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    marginLeft: Theme.spacing.md,
  },
  primaryButtonText: {
    color: Theme.colors.white,
    fontSize: 16,
    fontWeight: '600',
    marginRight: Theme.spacing.sm,
  },
  secondaryButton: {
    backgroundColor: Theme.colors.white,
    borderRadius: Theme.radius.md,
    paddingVertical: Theme.spacing.lg,
    paddingHorizontal: Theme.spacing.xl,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    marginRight: Theme.spacing.md,
    borderWidth: 1,
    borderColor: Theme.colors.teal,
  },
  secondaryButtonText: {
    color: Theme.colors.teal,
    fontSize: 16,
    fontWeight: '600',
    marginLeft: Theme.spacing.sm,
  },
});