// lib/network.ts
import Constants from "expo-constants";
import { generateSalt, hashPin } from "./authUtils";

/**
 * Use env: EXPO_PUBLIC_ONLINE_MODE=true to enable real requests.
 */
const ONLINE = process.env.EXPO_PUBLIC_ONLINE_MODE === "true";

type ActivatePayload = { username: string; pin: string; device_id: string };

// --- CLEAN BASE URL FUNCTION ---
function cleanBaseUrl(url?: string): string {
  if (!url) return "";
  return url.replace(/\/+$/, ""); // remove trailing slashes
}

export async function postActivate(payload: ActivatePayload) {
  if (!ONLINE) {
    // ---- LOCAL MOCK MODE ----
    const { username, pin } = payload;

    if (username === "DiguwaSoft" && pin === "1366") {
      const salt = generateSalt();
      const hash = await hashPin(pin, salt);

      return {
        ok: true,
        role: "admin",
        require_pin_change: true,
        last_pulled_commit: "init-0001",
        snapshot: mockSnapshot([
          {
            username: "DiguwaSoft",
            full_name: "Diguwa Soft Admin",
            role: "admin",
            pin_salt: salt,
            pin_hash: hash,
            device_id: null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            deleted: 0,
          },
        ]),
      };
    }

    return { ok: false, reason: "invalid_username_or_pin" };
  }

  // ---- REAL CLOUD MODE ----
  try {
    let base = cleanBaseUrl(process.env.EXPO_PUBLIC_API_BASE_URL);
    const url = `${base}/auth-activate`;

    console.log("🔥 FINAL ACTIVATE URL:", url);

    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    // Parse JSON response first
    const data = await res.json().catch(async (parseErr) => {
      // If JSON parsing fails, try to get raw text for debugging
      const text = await res.text().catch(() => "");
      console.log("❌ JSON PARSE ERROR:", parseErr, "Raw text:", text);
      return { ok: false, reason: "server_error" };
    });

    // Edge functions often return 200 with ok:false errors
    if (!data.ok) {
      console.log("❌ SERVER RETURNED ok:false:", data.reason);
      return { ok: false, reason: data.reason || "activation_failed" };
    }

    // Check HTTP status for other errors (though we should have handled ok:false above)
    if (!res.ok) {
      console.log("❌ HTTP ERROR STATUS:", res.status);
      return { ok: false, reason: data.reason || `server:${res.status}` };
    }

    // Success
    console.log("✅ ACTIVATION SUCCESS");
    return data;
  } catch (err: any) {
    console.log("❌ NETWORK ERROR:", err);
    return { ok: false, reason: "network_error" };
  }
}

// --- MOCK SNAPSHOT (unchanged) ---
function mockSnapshot(librariansOverride?: any[]) {
  const baseLibrarians = librariansOverride ?? [
    {
      username: "DiguwaSoft",
      full_name: "Diguwa Soft Admin",
      role: "admin",
      pin_salt: "srv-salt",
      pin_hash: "srv-hash",
      device_id: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      deleted: 0,
    }
  ];

  return {
    books: [],
    users: [],
    librarians: baseLibrarians,
    commits: [],
  };
}