// lib/authUtils.ts (TEMPORARY PLACEHOLDER)
export function generateSalt(): string {
  return "salt"; // temp
}
export async function hashPin(pin: string, salt: string): Promise<string> {
  return pin + salt; // temp
}
export async function verifyPinHash(pin: string, salt: string, hash: string) {
  return true; // temp
}
