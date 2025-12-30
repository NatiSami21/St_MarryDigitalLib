// church-library-app/components/PhotoPicker.tsx
import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  Alert,
  ActivityIndicator,
} from "react-native";
import { CameraView, CameraType, useCameraPermissions } from "expo-camera";
import * as ImagePicker from "expo-image-picker";
import Icon from 'react-native-vector-icons/Feather';
import { theme } from "../styles/theme";

type Props = {
  imageUri?: string | null;
  onChange: (uri: string) => void;
};

export default function PhotoPicker({ imageUri, onChange }: Props) {
  const [permission, requestPermission] = useCameraPermissions();
  const [showCamera, setShowCamera] = useState(false);
  const [facing, setFacing] = useState<CameraType>("back");
  const [cameraRef, setCameraRef] = useState<CameraView | null>(null);
  const [loading, setLoading] = useState(false);

  // -----------------------------------
  // PERMISSION GUARD
  // -----------------------------------
  if (!permission) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="small" color={theme.colors.teal} />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.permissionBox}>
        <Icon name="camera-off" size={24} color={theme.colors.error} style={styles.permissionIcon} />
        <Text style={styles.permissionText}>
          Camera access is required to capture ID photos
        </Text>
        <TouchableOpacity
          style={styles.permissionBtn}
          onPress={requestPermission}
        >
          <Text style={styles.permissionBtnText}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // -----------------------------------
  // CAPTURE PHOTO
  // -----------------------------------
  const takePhoto = async () => {
    try {
      if (!cameraRef) return;
      
      setLoading(true);
      const photo = await cameraRef.takePictureAsync({
        quality: 0.8,
        skipProcessing: false, // Changed for better compatibility
        base64: false,
      });

      if (photo.uri) {
        setShowCamera(false);
        onChange(photo.uri);
        console.log("Photo captured:", photo.uri);
      }
    } catch (err) {
      console.error("Photo capture error:", err);
      Alert.alert("Error", "Failed to capture photo");
    } finally {
      setLoading(false);
    }
  };

  // -----------------------------------
  // PICK FROM GALLERY
  // -----------------------------------
  const pickImage = async () => {
    try {
      setLoading(true);
      
      // Request permissions first
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Please allow access to your photos.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0].uri) {
        onChange(result.assets[0].uri);
        console.log("Image picked:", result.assets[0].uri);
      }
    } catch (err) {
      console.error("Image pick error:", err);
      Alert.alert("Error", "Failed to pick image from gallery");
    } finally {
      setLoading(false);
    }
  };

  // -----------------------------------
  // TOGGLE CAMERA FACING
  // -----------------------------------
  const toggleCameraFacing = () => {
    setFacing(current => (current === 'back' ? 'front' : 'back'));
  };

  // -----------------------------------
  // REMOVE PHOTO
  // -----------------------------------
  const removePhoto = () => {
    onChange("");
  };

  // -----------------------------------
  // UI
  // -----------------------------------
  return (
    <View style={styles.container}>
      {/* Preview Section */}
      {imageUri && !showCamera ? (
        <View style={styles.previewContainer}>
          <Image 
            source={{ uri: imageUri }} 
            style={styles.previewImage}
            resizeMode="cover"
            onError={(error) => {
              console.error("Image loading error:", error.nativeEvent.error);
              Alert.alert("Error", "Failed to load image");
            }}
          />
          <View style={styles.previewOverlay}>
            <TouchableOpacity
              style={styles.removeButton}
              onPress={removePhoto}
            >
              <Icon name="trash-2" size={20} color={theme.colors.white} />
            </TouchableOpacity>
          </View>
        </View>
      ) : showCamera ? null : (
        <View style={styles.placeholder}>
          <Icon name="camera" size={50} color={theme.colors.textLight} />
          <Text style={styles.placeholderText}>No photo selected</Text>
        </View>
      )}

      {/* Camera View */}
      {showCamera && (
        <View style={styles.cameraContainer}>
          <CameraView
            ref={(ref) => setCameraRef(ref)}
            style={styles.camera}
            facing={facing}
            mode="picture"
          />
          
          <View style={styles.cameraControls}>
            <TouchableOpacity
              style={styles.cameraButton}
              onPress={() => setShowCamera(false)}
            >
              <Icon name="x" size={24} color={theme.colors.white} />
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.captureButton}
              onPress={takePhoto}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color={theme.colors.white} />
              ) : (
                <View style={styles.captureButtonInner} />
              )}
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.cameraButton}
              onPress={toggleCameraFacing}
            >
              <Icon name="refresh-cw" size={24} color={theme.colors.white} />
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Action Buttons (when camera is not showing) */}
      {!showCamera && (
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[styles.actionButton, styles.primaryButton]}
            onPress={() => setShowCamera(true)}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color={theme.colors.white} />
            ) : (
              <>
                <Icon name="camera" size={18} color={theme.colors.white} />
                <Text style={styles.buttonText}>Capture Photo</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.secondaryButton]}
            onPress={pickImage}
            disabled={loading}
          >
            <Icon name="image" size={18} color={theme.colors.teal} />
            <Text style={[styles.buttonText, styles.secondaryButtonText]}>
              Pick from Gallery
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  centered: {
    alignItems: 'center',
    padding: theme.spacing.lg,
  },
  permissionBox: {
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.white,
    borderRadius: theme.radius.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  permissionIcon: {
    marginBottom: theme.spacing.md,
  },
  permissionText: {
    ...theme.typography.body,
    color: theme.colors.textDark,
    textAlign: 'center',
    marginBottom: theme.spacing.md,
  },
  permissionBtn: {
    backgroundColor: theme.colors.teal,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.radius.sm,
  },
  permissionBtnText: {
    color: theme.colors.white,
    fontWeight: '600',
  },
  previewContainer: {
    position: 'relative',
    marginBottom: theme.spacing.md,
    borderRadius: theme.radius.md,
    overflow: 'hidden',
    backgroundColor: theme.colors.cream, // Changed from background to cream
  },
  previewImage: {
    width: '100%',
    height: 220,
    backgroundColor: theme.colors.cream, // Changed from background to cream
  },
  previewOverlay: {
    position: 'absolute',
    top: theme.spacing.sm,
    right: theme.spacing.sm,
  },
  removeButton: {
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: theme.spacing.sm,
    borderRadius: theme.radius.sm,
  },
  placeholder: {
    height: 220,
    backgroundColor: theme.colors.white,
    borderRadius: theme.radius.md,
    borderWidth: 2,
    borderColor: theme.colors.border,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  placeholderText: {
    ...theme.typography.body,
    color: theme.colors.textLight,
    marginTop: theme.spacing.sm,
  },
  cameraContainer: {
    height: 300,
    borderRadius: theme.radius.md,
    overflow: 'hidden',
    marginBottom: theme.spacing.md,
    backgroundColor: 'black',
  },
  camera: {
    flex: 1,
  },
  cameraControls: {
    position: 'absolute',
    bottom: theme.spacing.lg,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.xl,
  },
  cameraButton: {
    padding: theme.spacing.sm,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: theme.radius.sm,
  },
  captureButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'rgba(255,255,255,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: theme.colors.white,
  },
  captureButtonInner: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: theme.colors.white,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: theme.spacing.md,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    borderRadius: theme.radius.md,
    gap: theme.spacing.sm,
  },
  primaryButton: {
    backgroundColor: theme.colors.teal,
  },
  secondaryButton: {
    backgroundColor: theme.colors.white,
    borderWidth: 1,
    borderColor: theme.colors.teal,
  },
  buttonText: {
    color: theme.colors.white,
    fontWeight: '600',
  },
  secondaryButtonText: {
    color: theme.colors.teal,
  },
});