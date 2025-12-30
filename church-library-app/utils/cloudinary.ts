// church-library-app/utils/cloudinary.ts - SIMPLIFIED VERSION
import * as FileSystem from 'expo-file-system';
import * as ImageManipulator from 'expo-image-manipulator';

const CLOUD_NAME = process.env.EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME;
const UPLOAD_PRESET = process.env.EXPO_PUBLIC_CLOUDINARY_UNSIGNED_PRESET;

export interface UploadResponse {
  secure_url: string;
  public_id: string;
  width: number;
  height: number;
  format: string;
}

export async function uploadImageToCloudinary(imageUri: string): Promise<UploadResponse> {
  try {
    console.log('Starting Cloudinary upload for:', imageUri);
    
    // Validate environment variables
    if (!CLOUD_NAME || !UPLOAD_PRESET) {
      throw new Error('Cloudinary configuration missing. Please check environment variables.');
    }

    // Check if file exists
    const fileInfo = await FileSystem.getInfoAsync(imageUri);
    if (!fileInfo.exists) {
      throw new Error('Image file does not exist');
    }

    // OPTIONAL: Resize/compress image before upload
    const manipulatedImage = await ImageManipulator.manipulateAsync(
      imageUri,
      [
        { resize: { width: 800 } }, // Resize to max 800px width
      ],
      {
        compress: 0.7, // 70% quality
        format: ImageManipulator.SaveFormat.JPEG,
        base64: true, // Get base64 string
      }
    );

    if (!manipulatedImage.base64) {
      throw new Error('Failed to process image');
    }

    // Create form data
    const formData = new FormData();
    formData.append('file', `data:image/jpeg;base64,${manipulatedImage.base64}`);
    formData.append('upload_preset', UPLOAD_PRESET);
    formData.append('folder', 'library_users');
    
    // Optimize image on Cloudinary
    formData.append('transformation', 'w_500,h_500,c_fill,q_auto,f_auto');

    console.log('Uploading to Cloudinary...');

    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
      {
        method: 'POST',
        body: formData,
        headers: {
          'Accept': 'application/json',
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Cloudinary upload failed:', response.status, errorText);
      throw new Error(`Upload failed: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    
    if (!data.secure_url) {
      console.error('Invalid Cloudinary response:', data);
      throw new Error('Invalid response from Cloudinary');
    }

    console.log('Cloudinary upload successful:', data.secure_url);
    return data;
  } catch (error) {
    console.error('Cloudinary upload error:', error);
    throw error;
  }
}

// Or if you don't want to use ImageManipulator, here's a simpler version:
export async function simpleUploadToCloudinary(imageUri: string): Promise<UploadResponse> {
  try {
    console.log('Simple Cloudinary upload for:', imageUri);
    
    if (!CLOUD_NAME || !UPLOAD_PRESET) {
      throw new Error('Cloudinary configuration missing.');
    }

    // Create form data with file URI
    const formData = new FormData();
    
    // Get file name
    const fileName = imageUri.split('/').pop() || 'photo.jpg';
    
    // @ts-ignore - React Native FormData format
    formData.append('file', {
      uri: imageUri,
      type: 'image/jpeg',
      name: fileName,
    });
    
    formData.append('upload_preset', UPLOAD_PRESET);
    formData.append('folder', 'library_users');

    console.log('Uploading...');

    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
      {
        method: 'POST',
        body: formData,
        headers: {
          'Content-Type': 'multipart/form-data',
          'Accept': 'application/json',
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Upload failed:', response.status, errorText);
      throw new Error(`Upload failed: ${response.status}`);
    }

    const data = await response.json();
    
    if (!data.secure_url) {
      console.error('Invalid response:', data);
      throw new Error('Invalid response from Cloudinary');
    }

    console.log('Upload successful:', data.secure_url);
    return data;
  } catch (error) {
    console.error('Upload error:', error);
    throw error;
  }
}

export const PLACEHOLDER_IMAGE = 'https://res.cloudinary.com/demo/image/upload/v1689876543/user-placeholder.png';