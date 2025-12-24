// components/PhotoPicker.tsx
import React, { useRef, useState, useEffect } from "react";
import { 
  View, 
  Text, 
  TouchableOpacity, 
  Image, 
  ActivityIndicator, 
  Alert, 
  Linking,
  StyleSheet 
} from "react-native";
import { CameraView, useCameraPermissions, CameraType } from "expo-camera";
import { uploadToCloudinary } from "../utils/uploadImage";
import { Ionicons } from "@expo/vector-icons"; 
import * as ImagePicker from 'expo-image-picker';
import { theme } from "../styles/theme";

interface PhotoPickerProps {
  imageUri: string | null;
  onChange: (uri: string | null) => void;
}

export default function PhotoPicker({ imageUri, onChange }: PhotoPickerProps) {
  const cameraRef = useRef<CameraView>(null);
  const [open, setOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [facing, setFacing] = useState<CameraType>('front');
  const [permission, requestPermission] = useCameraPermissions();
  const [cameraReady, setCameraReady] = useState(false);

  // Request camera permissions when component mounts
  useEffect(() => {
    (async () => {
      if (!permission?.granted) {
        await requestPermission();
      }
    })();
  }, []);

  const toggleCameraFacing = () => {
    setFacing(current => (current === 'back' ? 'front' : 'back'));
  };

  const handlePhotoSave = async () => {
    if (!cameraRef.current || !cameraReady) return;

    try {
      const photo = await cameraRef.current.takePictureAsync({ 
        quality: 0.8,
        skipProcessing: false 
      });
      setOpen(false);
      setUploading(true);

      const uploadedUrl = await uploadToCloudinary(photo.uri);
      onChange(uploadedUrl);
    } catch (err) {
      console.log("Camera capture error:", err);
      Alert.alert("Capture Error", "Failed to capture photo. Please try again.");
    } finally {
      setUploading(false);
      setCameraReady(false);
    }
  };

  const handlePickImage = async () => {
    try {
      // Request media library permissions
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert(
          "Permission Required",
          "Sorry, we need camera roll permissions to upload photos.",
          [
            { text: "Cancel", style: "cancel" },
            { text: "Open Settings", onPress: () => Linking.openSettings() }
          ]
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled) {
        setUploading(true);
        const uploadedUrl = await uploadToCloudinary(result.assets[0].uri);
        onChange(uploadedUrl);
      }
    } catch (err) {
      console.log("Image picker error:", err);
      Alert.alert("Error", "Failed to pick image. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  const handleOpenCamera = async () => {
    if (!permission) {
      const requested = await requestPermission();
      if (!requested?.granted) {
        Alert.alert(
          "Camera Permission Required",
          "Camera permission is required to take photos.",
          [
            { text: "Cancel", style: "cancel" },
            { text: "Open Settings", onPress: () => Linking.openSettings() }
          ]
        );
        return;
      }
    }

    if (!permission?.granted) {
      Alert.alert(
        "Camera Permission Required",
        "Camera permission is required to take photos. Please enable it in your device settings.",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Open Settings", onPress: () => Linking.openSettings() }
        ]
      );
      return;
    }

    setOpen(true);
    setCameraReady(false); // Reset camera ready state
  };

  const handleCameraReady = () => {
    setCameraReady(true);
  };

  const handleCancelCamera = () => {
    setOpen(false);
    setFacing('front');
    setCameraReady(false);
  };

  // CAMERA OPEN
  if (open) {
    if (!permission?.granted) {
      return (
        <View style={styles.permissionContainer}>
          <Ionicons name="camera-outline" size={64} color={theme.colors.textLight} />
          <Text style={styles.permissionTitle}>Camera Access Denied</Text>
          <Text style={styles.permissionText}>
            Please enable camera permissions in your device settings to take photos.
          </Text>
          <TouchableOpacity
            onPress={handleCancelCamera}
            style={styles.permissionButton}
          >
            <Text style={styles.permissionButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View style={styles.cameraContainer}>
        <CameraView 
          ref={cameraRef} 
          style={styles.camera}
          facing={facing}
          onCameraReady={handleCameraReady}
          mode="picture"
        />

        {!cameraReady && (
          <View style={styles.cameraLoading}>
            <ActivityIndicator size="large" color={theme.colors.white} />
            <Text style={styles.cameraLoadingText}>Initializing camera...</Text>
          </View>
        )}

        {/* Camera Controls */}
        <View style={styles.cameraControls}>
          {/* Cancel Button */}
          <TouchableOpacity
            onPress={handleCancelCamera}
            style={styles.cameraButton}
          >
            <Ionicons name="close" size={24} color={theme.colors.white} />
          </TouchableOpacity>

          {/* Capture Button */}
          <TouchableOpacity
            onPress={handlePhotoSave}
            disabled={!cameraReady}
            style={[styles.captureButton, !cameraReady && styles.captureButtonDisabled]}
          >
            <View style={styles.captureInner} />
          </TouchableOpacity>

          {/* Flip Camera Button */}
          <TouchableOpacity
            onPress={toggleCameraFacing}
            style={styles.cameraButton}
          >
            <Ionicons name="camera-reverse-outline" size={24} color={theme.colors.white} />
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // MAIN UI
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Profile Photo</Text>
      <Text style={styles.subtitle}>Optional - Capture or upload a photo</Text>

      {uploading && (
        <View style={styles.uploadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.navy} />
          <Text style={styles.uploadingText}>Uploading...</Text>
        </View>
      )}

      {imageUri ? (
        <View style={styles.imagePreviewContainer}>
          <Image
            source={{ uri: imageUri }}
            style={styles.imagePreview}
            resizeMode="cover"
          />
          <View style={styles.imageActions}>
            <TouchableOpacity
              onPress={handleOpenCamera}
              style={[styles.actionButton, styles.retakeButton]}
            >
              <Ionicons name="camera" size={16} color={theme.colors.white} />
              <Text style={styles.actionButtonText}>Retake</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handlePickImage}
              style={[styles.actionButton, styles.uploadButton]}
            >
              <Ionicons name="images" size={16} color={theme.colors.white} />
              <Text style={styles.actionButtonText}>Change</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => onChange(null)}
              style={[styles.actionButton, styles.removeButton]}
            >
              <Ionicons name="trash" size={16} color={theme.colors.white} />
              <Text style={styles.actionButtonText}>Remove</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <View style={styles.photoOptions}>
          <TouchableOpacity
            onPress={handleOpenCamera}
            style={styles.photoOption}
          >
            <View style={styles.photoOptionIconContainer}>
              <Ionicons name="camera" size={32} color={theme.colors.navy} />
            </View>
            <Text style={styles.photoOptionText}>Take Photo</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handlePickImage}
            style={styles.photoOption}
          >
            <View style={styles.photoOptionIconContainer}>
              <Ionicons name="images" size={32} color={theme.colors.navy} />
            </View>
            <Text style={styles.photoOptionText}>Upload Photo</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
  },
  title: {
    fontSize: 16,
    fontWeight: "600",
    color: theme.colors.textDark,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: theme.colors.textLight,
    marginBottom: 16,
  },
  uploadingContainer: {
    alignItems: "center",
    padding: 20,
    backgroundColor: theme.colors.cream,
    borderRadius: 12,
    marginVertical: 10,
  },
  uploadingText: {
    marginTop: 10,
    color: theme.colors.textLight,
  },
  imagePreviewContainer: {
    alignItems: "center",
  },
  imagePreview: {
    width: 160,
    height: 160,
    borderRadius: 80,
    marginBottom: 16,
    borderWidth: 4,
    borderColor: theme.colors.white,
    shadowColor: theme.colors.navy,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  imageActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    minWidth: 100,
    gap: 6,
  },
  retakeButton: {
    backgroundColor: theme.colors.teal,
  },
  uploadButton: {
    backgroundColor: theme.colors.navy,
  },
  removeButton: {
    backgroundColor: theme.colors.error,
  },
  actionButtonText: {
    color: theme.colors.white,
    fontWeight: '600',
    fontSize: 14,
  },
  photoOptions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 8,
  },
  photoOption: {
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 8,
  },
  photoOptionIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: theme.colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    borderWidth: 2,
    borderColor: theme.colors.border,
    shadowColor: theme.colors.navy,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  photoOptionText: {
    fontSize: 14,
    color: theme.colors.textDark,
    fontWeight: '500',
    textAlign: 'center',
  },
  cameraContainer: {
    height: 400,
    borderRadius: 12,
    overflow: 'hidden',
    marginVertical: 10,
  },
  camera: {
    flex: 1,
  },
  cameraLoading: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  cameraLoadingText: {
    color: theme.colors.white,
    marginTop: 12,
  },
  cameraControls: {
    position: "absolute",
    bottom: 20,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  cameraButton: {
    backgroundColor: "rgba(30, 58, 138, 0.8)",
    padding: 12,
    borderRadius: 50,
    width: 50,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureButton: {
    backgroundColor: theme.colors.white,
    padding: 25,
    borderRadius: 50,
    borderWidth: 4,
    borderColor: theme.colors.navy,
  },
  captureButtonDisabled: {
    opacity: 0.5,
  },
  captureInner: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.navy,
  },
  permissionContainer: {
    padding: 20,
    alignItems: 'center',
    backgroundColor: theme.colors.white,
    borderRadius: 12,
    marginVertical: 10,
  },
  permissionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.textDark,
    marginBottom: 8,
    marginTop: 16,
    textAlign: 'center',
  },
  permissionText: {
    color: theme.colors.textLight,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  permissionButton: {
    backgroundColor: theme.colors.textLight,
    padding: 12,
    borderRadius: 10,
    minWidth: 120,
  },
  permissionButtonText: {
    color: theme.colors.white,
    textAlign: "center",
    fontWeight: '600',
  },
});