import * as Crypto from "expo-crypto";

/**
 * Generate a secure random salt (returns hex string)
 */
export function generateSalt(length = 16): string {
  const randomBytes = Crypto.getRandomBytes(length);
  return Array.from(randomBytes)
    .map(b => b.toString(16).padStart(2, "0"))
    .join(""); // hex string
}

/**
 * Hash PIN using SHA-256(salt + ":" + pin)
 */
export async function hashPin(pin: string, salt: string): Promise<string> {
  const input = `${salt}:${pin}`;

  return await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    input,
    {
      encoding: Crypto.CryptoEncoding.HEX,
    }
  );
}

/**
 * Verify PIN
 */
export async function verifyPinHash(
  pin: string,
  salt: string,
  storedHash: string
): Promise<boolean> {
  if (!salt || !storedHash) return false;

  const computed = await hashPin(pin, salt);
  return computed === storedHash;
}
