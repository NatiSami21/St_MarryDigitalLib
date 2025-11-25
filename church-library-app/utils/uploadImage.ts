// utils/uploadImage.ts
import * as FileSystem from "expo-file-system/legacy";

export async function uploadToCloudinary(uri: string) {
  const cloudName = process.env.EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const uploadPreset = process.env.EXPO_PUBLIC_CLOUDINARY_UNSIGNED_PRESET;

  if (!cloudName || !uploadPreset) {
    throw new Error("Missing Cloudinary environment variables");
  }

  // Check if file exists using the modern API approach
  try { 
    await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
  } catch (error) {
    throw new Error("File does not exist or cannot be accessed");
  }

  // Extract file extension and determine MIME type
  const fileExtension = uri.split('.').pop()?.toLowerCase() || 'jpg';
  const mimeType = getMimeType(fileExtension);

  // Create FormData for direct file upload
  const formData = new FormData();
  
  // @ts-ignore - React Native FormData format
  formData.append('file', {
    uri,
    type: mimeType,
    name: `upload.${fileExtension}`,
  } as any);
  
  formData.append('upload_preset', uploadPreset);

  try {
    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
      {
        method: 'POST',
        body: formData,
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'multipart/form-data',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    if (!data.secure_url) {
      console.log("Cloudinary error:", data);
      throw new Error("Cloudinary upload failed");
    }

    return data.secure_url;
  } catch (error) {
    console.error("Upload error:", error);
    throw new Error(`Failed to upload image: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Helper function to determine MIME type
function getMimeType(extension: string): string {
  const mimeTypes: { [key: string]: string } = {
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'png': 'image/png',
    'gif': 'image/gif',
    'webp': 'image/webp',
    'bmp': 'image/bmp',
    'heic': 'image/heic',
    'heif': 'image/heif',
  };
  
  return mimeTypes[extension] || 'image/jpeg';
}