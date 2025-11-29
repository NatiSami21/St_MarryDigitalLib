// lib/secureSession.ts
import * as SecureStore from "expo-secure-store";

// ------------------------------
// Generic Save/Get/Clear helpers
// ------------------------------
export async function saveSessionToken(key: string, value: string) {
  await SecureStore.setItemAsync(key, value, {
    keychainService: key,
  });
}

export async function getSessionToken(key: string): Promise<string | null> {
  return await SecureStore.getItemAsync(key);
}

export async function clearSessionToken(key: string) {
  await SecureStore.deleteItemAsync(key);
}

// ------------------------------
// Current user helpers
// ------------------------------
const CURRENT_USER_KEY = "current_user";
const DEVICE_ID_KEY = "device_id";

// Store the username on login
export async function storeCurrentUser(username: string) {
  await saveSessionToken(CURRENT_USER_KEY, username);
}

// Retrieve username
export async function getCurrentUser(): Promise<string | null> {
  return await getSessionToken(CURRENT_USER_KEY);
}

// Clear user
export async function clearCurrentUser() {
  await clearSessionToken(CURRENT_USER_KEY);
}

// ------------------------------
// Device ID binding helpers
// ------------------------------
export async function storeDeviceId(deviceId: string) {
  await saveSessionToken(DEVICE_ID_KEY, deviceId);
}

export async function getStoredDeviceId() {
  return await getSessionToken(DEVICE_ID_KEY);
}

export async function clearDeviceId() {
  await clearSessionToken(DEVICE_ID_KEY);
}
