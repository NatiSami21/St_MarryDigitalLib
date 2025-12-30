// church-library-app/components/PhotoPicker.tsx
import React, { useState, useEffect } from "react";
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
import NetInfo from '@react-native-community/netinfo';
import { theme } from "../styles/theme";
import { simpleUploadToCloudinary, PLACEHOLDER_IMAGE } from "../utils/cloudinary";

type Props = {
  imageUri?: string | null;
  onChange: (cloudinaryUrl: string | null) => void;
  onUploadStatus?: (isUploading: boolean) => void;
};

export default function PhotoPicker({ imageUri, onChange, onUploadStatus }: Props) {
  const [permission, requestPermission] = useCameraPermissions();
  const [showCamera, setShowCamera] = useState(false);
  const [facing, setFacing] = useState<CameraType>("back");
  const [cameraRef, setCameraRef] = useState<CameraView | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [isOnline, setIsOnline] = useState(true);

  // Check network connectivity
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      setIsOnline(state.isConnected ?? false);
    });

    // Initial check
    NetInfo.fetch().then(state => {
      setIsOnline(state.isConnected ?? false);
    });

    return () => unsubscribe();
  }, []);

  // Notify parent about upload status
  useEffect(() => {
    onUploadStatus?.(uploading);
  }, [uploading]);

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
  // UPLOAD IMAGE TO CLOUDINARY
  // -----------------------------------
  const uploadImage = async (localUri: string): Promise<string | null> => {
    if (!isOnline) {
      Alert.alert(
        "No Internet Connection",
        "Cannot upload image. Please connect to internet and try again. Using placeholder for now.",
        [{ text: "OK" }]
      );
      return PLACEHOLDER_IMAGE;
    }

    setUploading(true);
    try {
      // Try the simple upload first
      const result = await simpleUploadToCloudinary(localUri);
      console.log("Image uploaded to Cloudinary:", result.secure_url);
      return result.secure_url;
    } catch (error) {
      console.error("Failed to upload image:", error);
      Alert.alert(
        "Upload Failed",
        "Could not upload image to cloud. Using placeholder instead.",
        [{ text: "OK" }]
      );
      return PLACEHOLDER_IMAGE;
    } finally {
      setUploading(false);
    }
  };

  // -----------------------------------
  // CAPTURE PHOTO
  // -----------------------------------
  const takePhoto = async () => {
    try {
      if (!cameraRef) return;
      
      setLoading(true);
      const photo = await cameraRef.takePictureAsync({
        quality: 0.7, // Lower quality for faster upload
        skipProcessing: false,
        base64: false,
      });

      if (photo.uri) {
        setShowCamera(false);
        
        // Upload to Cloudinary
        const cloudinaryUrl = await uploadImage(photo.uri);
        onChange(cloudinaryUrl);
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
        quality: 0.7,
      });

      if (!result.canceled && result.assets[0].uri) {
        // Upload to Cloudinary
        const cloudinaryUrl = await uploadImage(result.assets[0].uri);
        onChange(cloudinaryUrl);
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
    Alert.alert(
      "Remove Photo",
      "Are you sure you want to remove this photo?",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Remove", 
          style: "destructive",
          onPress: () => onChange(null)
        },
      ]
    );
  };

  // Check if image is a Cloudinary URL or local URI
  const isCloudinaryUrl = imageUri?.includes('cloudinary.com') || 
                         imageUri?.includes('res.cloudinary.com') ||
                         imageUri === PLACEHOLDER_IMAGE;

  // -----------------------------------
  // UI
  // -----------------------------------
  return (
    <View style={styles.container}>
      {/* Network Status */}
      {!isOnline && (
        <View style={styles.networkAlert}>
          <Icon name="wifi-off" size={16} color={theme.colors.warning} />
          <Text style={styles.networkText}>Offline - Images will use placeholder</Text>
        </View>
      )}

      {/* Preview Section */}
      {imageUri ? (
        <View style={styles.previewContainer}>
          <Image 
            source={{ uri: imageUri }} 
            style={styles.previewImage}
            resizeMode="cover"
            onError={(error) => {
              console.error("Image loading error:", error.nativeEvent.error);
              // If image fails to load, use placeholder
              if (!isCloudinaryUrl && imageUri !== PLACEHOLDER_IMAGE) {
                onChange(PLACEHOLDER_IMAGE);
              }
            }}
          />
          
          {/* Upload indicator */}
          {uploading && (
            <View style={styles.uploadOverlay}>
              <ActivityIndicator size="large" color={theme.colors.white} />
              <Text style={styles.uploadText}>Uploading to cloud...</Text>
            </View>
          )}
          
          {/* Source indicator */}
          <View style={styles.sourceIndicator}>
            {isCloudinaryUrl ? (
              <View style={styles.cloudIndicator}>
                <Icon name="cloud" size={14} color={theme.colors.success} />
                <Text style={styles.cloudText}>Cloud</Text>
              </View>
            ) : (
              <View style={styles.localIndicator}>
                <Icon name="smartphone" size={14} color={theme.colors.warning} />
                <Text style={styles.localText}>Local</Text>
              </View>
            )}
          </View>
          
          <View style={styles.previewOverlay}>
            <TouchableOpacity
              style={styles.removeButton}
              onPress={removePhoto}
              disabled={uploading}
            >
              <Icon name="trash-2" size={20} color={theme.colors.white} />
            </TouchableOpacity>
          </View>
        </View>
      ) : showCamera ? null : (
        <View style={styles.placeholder}>
          <Icon name="camera" size={50} color={theme.colors.textLight} />
          <Text style={styles.placeholderText}>No photo selected</Text>
          <Text style={styles.placeholderSubtext}>
            {isOnline ? "Will upload to cloud automatically" : "Offline - placeholder will be used"}
          </Text>
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
              disabled={loading || uploading}
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
            disabled={loading || uploading}
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
            disabled={loading || uploading}
          >
            <Icon name="image" size={18} color={theme.colors.teal} />
            <Text style={[styles.buttonText, styles.secondaryButtonText]}>
              Pick from Gallery
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Help Text */}
      <View style={styles.helpContainer}>
        <Icon name="info" size={14} color={theme.colors.textLight} />
        <Text style={styles.helpText}>
          Photos are uploaded to cloud storage and accessible across all devices
        </Text>
      </View>
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
  networkAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(243, 156, 18, 0.1)',
    borderWidth: 1,
    borderColor: theme.colors.warning,
    borderRadius: theme.radius.sm,
    padding: theme.spacing.sm,
    marginBottom: theme.spacing.md,
    gap: theme.spacing.xs,
  },
  networkText: {
    ...theme.typography.caption,
    color: theme.colors.warning,
    fontSize: 12,
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
    backgroundColor: theme.colors.cream,
  },
  previewImage: {
    width: '100%',
    height: 220,
    backgroundColor: theme.colors.cream,
  },
  uploadOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  uploadText: {
    color: theme.colors.white,
    marginTop: theme.spacing.sm,
    fontWeight: '600',
  },
  sourceIndicator: {
    position: 'absolute',
    top: theme.spacing.sm,
    left: theme.spacing.sm,
  },
  cloudIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(39, 174, 96, 0.9)',
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
    borderRadius: theme.radius.sm,
    gap: 4,
  },
  cloudText: {
    color: theme.colors.white,
    fontSize: 10,
    fontWeight: '600',
  },
  localIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(243, 156, 18, 0.9)',
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
    borderRadius: theme.radius.sm,
    gap: 4,
  },
  localText: {
    color: theme.colors.white,
    fontSize: 10,
    fontWeight: '600',
  },
  previewOverlay: {
    position: 'absolute',
    top: theme.spacing.sm,
    right: theme.spacing.sm,
  },
  removeButton: {
    backgroundColor: 'rgba(231, 76, 60, 0.8)',
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
    padding: theme.spacing.lg,
  },
  placeholderText: {
    ...theme.typography.body,
    color: theme.colors.textLight,
    marginTop: theme.spacing.sm,
  },
  placeholderSubtext: {
    ...theme.typography.caption,
    color: theme.colors.textLight,
    marginTop: theme.spacing.xs,
    textAlign: 'center',
    fontStyle: 'italic',
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
    marginBottom: theme.spacing.md,
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
  helpContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(127, 140, 141, 0.1)',
    borderRadius: theme.radius.sm,
    padding: theme.spacing.sm,
    gap: theme.spacing.xs,
  },
  helpText: {
    ...theme.typography.caption,
    color: theme.colors.textLight,
    flex: 1,
    fontSize: 12,
  },
});