// lib/authUtils.ts
import * as Crypto from "expo-crypto";

// ----------------------------------------------------
// 1. Generate Salt (16 bytes → base64)
// ----------------------------------------------------
export function generateSalt(): string {
  const random = Crypto.getRandomBytes(16);
  return Buffer.from(random).toString("base64");
}

// ----------------------------------------------------
// 2. Hash PIN using SHA-256 + Salt
//    (Expo compatible, secure enough for offline PIN auth)
// ----------------------------------------------------
export async function hashPin(pin: string, salt: string): Promise<string> {
  const input = pin + ":" + salt;

  return await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    input,
    { encoding: Crypto.CryptoEncoding.BASE64 }
  );
}

// ----------------------------------------------------
// 3. Verify PIN (constant-time safe comparisons are not necessary for PIN)
// ----------------------------------------------------
export async function verifyPinHash(
  pin: string,
  salt: string,
  storedHash: string
): Promise<boolean> {
  const newHash = await hashPin(pin, salt);
  return newHash === storedHash;
}
