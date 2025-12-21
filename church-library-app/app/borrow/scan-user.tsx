// church-library-app/app/borrow/scan-user.tsx

import { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Vibration,
  StyleSheet,
} from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { useRouter, useLocalSearchParams } from "expo-router";
import Icon from 'react-native-vector-icons/Feather';
import { Theme } from "../../styles/theme";

export default function ScanUser() {
  const [permission, requestPermission] = useCameraPermissions();
  const [scannedCode, setScannedCode] = useState<string | null>(null);
  const { book_code } = useLocalSearchParams();
  const router = useRouter();

  if (!book_code) {
    return (
      <View style={styles.errorContainer}>
        <Icon name="alert-circle" size={64} color={Theme.colors.error} />
        <Text style={styles.errorTitle}>Missing Book Information</Text>
        <Text style={styles.errorText}>
          Please scan a book first before proceeding to user scan.
        </Text>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.primaryButton}
        >
          <Icon name="arrow-left" size={20} color={Theme.colors.white} style={{ marginRight: Theme.spacing.sm }} />
          <Text style={styles.primaryButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!permission?.granted) {
    return (
      <View style={styles.permissionContainer}>
        <Icon name="camera-off" size={64} color={Theme.colors.textLight} style={styles.permissionIcon} />
        <Text style={styles.permissionTitle}>Camera Access Required</Text>
        <Text style={styles.permissionText}>
          To scan user ID cards, we need access to your camera
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

  const handleScan = (code: string) => {
    if (scannedCode) return;
    setScannedCode(code);
    Vibration.vibrate(120);
  };

  return (
    <View style={styles.container}>
      {!scannedCode ? (
        <>
          <CameraView
            style={styles.camera}
            barcodeScannerSettings={{ barcodeTypes: ["qr", "code128"] }}
            onBarcodeScanned={(r) => handleScan(r.data)}
          />
          <View style={styles.scannerOverlay}>
            <View style={styles.scannerFrame} />
            <Text style={styles.scannerText}>Align user ID within frame</Text>
          </View>
          
          <View style={styles.header}>
            <TouchableOpacity
              onPress={() => router.back()}
              style={styles.backButton}
            >
              <Icon name="arrow-left" size={24} color={Theme.colors.white} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Scan User ID</Text>
          </View>
        </>
      ) : (
        <View style={styles.successContainer}>
          <View style={styles.successIconContainer}>
            <Icon name="user-check" size={80} color={Theme.colors.success} />
          </View>
          
          <Text style={styles.successTitle}>User Scanned Successfully!</Text>
          <Text style={styles.successSubtitle}>Fayda ID</Text>
          
          <View style={styles.codeContainer}>
            <Icon name="user" size={20} color={Theme.colors.teal} />
            <Text style={styles.codeText}>{scannedCode}</Text>
          </View>

          <View style={styles.buttonContainer}>
            <TouchableOpacity
              onPress={() => setScannedCode(null)}
              style={styles.secondaryButton}
            >
              <Icon name="rotate-ccw" size={20} color={Theme.colors.teal} />
              <Text style={styles.secondaryButtonText}>Scan Again</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              onPress={() =>
                router.replace({
                  pathname: "/borrow/confirm",
                  params: {
                    book_code,
                    fayda_id: scannedCode,
                  },
                })
              }
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
    backgroundColor: Theme.colors.navy,
  },
  errorContainer: {
    flex: 1,
    backgroundColor: Theme.colors.cream,
    padding: Theme.spacing.xl,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorTitle: {
    ...Theme.typography.h2,
    color: Theme.colors.error,
    textAlign: 'center',
    marginTop: Theme.spacing.lg,
    marginBottom: Theme.spacing.sm,
  },
  errorText: {
    ...Theme.typography.body,
    color: Theme.colors.textLight,
    textAlign: 'center',
    marginBottom: Theme.spacing.xl,
    maxWidth: '80%',
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
    color: Theme.colors.navy,
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
    backgroundColor: 'rgba(0, 49, 83, 0.7)',
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
    color: Theme.colors.navy,
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
  },
  codeText: {
    ...Theme.typography.h3,
    color: Theme.colors.teal,
    marginLeft: Theme.spacing.sm,
    fontFamily: 'monospace',
  },
  buttonContainer: {
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'space-between',
  },
  primaryButton: {
    backgroundColor: Theme.colors.navy,
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