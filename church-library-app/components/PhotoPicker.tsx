// components/PhotoPicker.tsx
import React, { useRef, useState } from "react";
import { View, Text, TouchableOpacity, Image, ActivityIndicator, Alert, Linking } from "react-native";
import { CameraView, useCameraPermissions, CameraType } from "expo-camera";
import { uploadToCloudinary } from "../utils/uploadImage";
import { Ionicons } from "@expo/vector-icons"; 
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

  const toggleCameraFacing = () => {
    setFacing(current => (current === 'back' ? 'front' : 'back'));
  };

  const handlePhotoSave = async () => {
    if (!cameraRef.current) return;

    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.9 });
      setOpen(false);
      setUploading(true);

      const uploadedUrl = await uploadToCloudinary(photo.uri);
      onChange(uploadedUrl);
    } catch (err) {
      console.log("Cloudinary upload error:", err);
      Alert.alert("Upload Error", "Failed to upload photo. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  const handleOpenCamera = async () => {
    if (!permission) {
      // Permission not yet determined
      return;
    }

    if (!permission.granted) {
      if (permission.canAskAgain) {
        await requestPermission();
      } else {
        Alert.alert(
          "Camera Permission Required",
          "Camera permission is required to take photos. Please enable it in your device settings.",
          [
            { text: "OK", style: "default" },
            { text: "Open Settings", onPress: () => Linking.openSettings() }
          ]
        );
        return;
      }
    }

    setOpen(true);
  };

  const handleCancelCamera = () => {
    setOpen(false);
    setFacing('front'); // Reset to front camera when closing
  };

  // CAMERA OPEN
  if (open) {
    if (!permission?.granted) {
      return (
        <View style={{ padding: 20, alignItems: 'center' }}>
          <Ionicons name="camera-outline" size={64} color="#6b7280" style={{ marginBottom: 16 }} />
          <Text style={{ fontSize: 18, fontWeight: '600', marginBottom: 8, textAlign: 'center' }}>
            Camera Access Denied
          </Text>
          <Text style={{ color: '#6b7280', textAlign: 'center', marginBottom: 20 }}>
            Please enable camera permissions in your device settings to take photos.
          </Text>
          <TouchableOpacity
            onPress={handleCancelCamera}
            style={{
              backgroundColor: "#6b7280",
              padding: 12,
              borderRadius: 10,
              minWidth: 120,
            }}
          >
            <Text style={{ color: "white", textAlign: "center", fontWeight: '600' }}>
              Go Back
            </Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View style={{ height: 400 }}>
        <CameraView 
          ref={cameraRef} 
          style={{ flex: 1 }} 
          facing={facing}
        />

        {/* Camera Controls */}
        <View style={{
          position: "absolute",
          bottom: 20,
          left: 0,
          right: 0,
          flexDirection: "row",
          justifyContent: "space-around",
          alignItems: "center",
          paddingHorizontal: 20,
        }}>
          {/* Cancel Button */}
          <TouchableOpacity
            onPress={handleCancelCamera}
            style={{
              backgroundColor: "rgba(239, 68, 68, 0.8)",
              padding: 12,
              borderRadius: 50,
              width: 50,
              height: 50,
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <Ionicons name="close" size={24} color="white" />
          </TouchableOpacity>

          {/* Capture Button */}
          <TouchableOpacity
            onPress={handlePhotoSave}
            style={{
              backgroundColor: "white",
              padding: 25,
              borderRadius: 50,
              borderWidth: 4,
              borderColor: "#1e3a8a",
            }}
          />

          {/* Flip Camera Button */}
          <TouchableOpacity
            onPress={toggleCameraFacing}
            style={{
              backgroundColor: "rgba(30, 58, 138, 0.8)",
              padding: 12,
              borderRadius: 50,
              width: 50,
              height: 50,
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <Ionicons name="camera-reverse-outline" size={24} color="white" />
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // MAIN UI
  return (
    <View style={{ marginBottom: 20 }}>
      <Text style={{ fontWeight: "600", marginBottom: 8, fontSize: 16 }}>Photo</Text>

      {uploading && (
        <View style={{ alignItems: "center", marginVertical: 20 }}>
          <ActivityIndicator size="large" color="#1e3a8a" />
          <Text style={{ marginTop: 10, color: '#6b7280' }}>Uploading...</Text>
        </View>
      )}

      {imageUri ? (
        <View style={{ alignItems: "center" }}>
          <Image
            source={{ uri: imageUri }}
            style={{
              width: 160,
              height: 160,
              borderRadius: 20,
              marginBottom: 16,
              borderWidth: 2,
              borderColor: '#e5e7eb',
            }}
          />
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <TouchableOpacity
              onPress={handleOpenCamera}
              style={{
                backgroundColor: "#ef4444",
                paddingHorizontal: 16,
                paddingVertical: 12,
                borderRadius: 10,
                minWidth: 120,
              }}
            >
              <Text style={{ color: "white", textAlign: "center", fontWeight: '600' }}>
                Retake Photo
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => onChange(null)}
              style={{
                backgroundColor: "#6b7280",
                paddingHorizontal: 16,
                paddingVertical: 12,
                borderRadius: 10,
                minWidth: 120,
              }}
            >
              <Text style={{ color: "white", textAlign: "center", fontWeight: '600' }}>
                Remove Photo
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <TouchableOpacity
          onPress={handleOpenCamera}
          style={{
            backgroundColor: "#1e3a8a",
            padding: 16,
            borderRadius: 10,
            alignItems: "center",
            flexDirection: 'row',
            justifyContent: 'center',
            gap: 8,
          }}
        >
          <Ionicons name="camera-outline" size={20} color="white" />
          <Text style={{ color: "white", fontWeight: "600", fontSize: 16 }}>
            Take Photo
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}