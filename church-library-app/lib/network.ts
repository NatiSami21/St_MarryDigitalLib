// lib/network.ts
import Constants from "expo-constants";

/**
 * Use env: EXPO_PUBLIC_ONLINE_MODE=true to enable real requests.
 * Default: mocked responses (local).
 */
const ONLINE = (process.env.EXPO_PUBLIC_ONLINE_MODE === "true") || false;

type ActivatePayload = { username: string; pin: string; device_id: string };

export async function postActivate(payload: ActivatePayload) {
  if (!ONLINE) {
    // mocked behaviour:
    // Accept DiguwaSoft / 1366 or any username that starts with "lib" for demo
    const { username, pin, device_id } = payload;

    // demo validation logic:
    if (username === "DiguwaSoft" && pin === "1366") {
      return {
        ok: true,
        role: "admin",
        require_pin_change: false,
        last_pulled_commit: "init-0001",
        snapshot: mockSnapshot(),
      };
    }

    // simulate: if username startsWith lib and pin === '0000' allow activation with require_pin_change true
    if (username.toLowerCase().startsWith("lib") && (pin === "0000" || pin === "1234")) {
      return {
        ok: true,
        role: "librarian",
        require_pin_change: true,
        last_pulled_commit: "init-0001",
        snapshot: mockSnapshot(),
      };
    }

    return { ok: false, reason: "invalid_username_or_pin" };
  }

  // real mode - implement your real endpoint here
  try {
    const res = await fetch("https://your-server.com/auth/activate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      return { ok: false, reason: `server:${res.status}` };
    }
    const data = await res.json();
    return data;
  } catch (err: any) {
    return { ok: false, reason: err.message || "network_error" };
  }
}

/** Mock snapshot shape — adjust to match your real snapshot */
function mockSnapshot() {
  return {
    books: [
      { book_code: "book-1", title: "Sample Book A", author: "Author A", category: "General", notes: "", copies: 3, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), sync_status: "synced" },
      { book_code: "book-2", title: "Sample Book B", author: "Author B", category: "Theology", notes: "", copies: 2, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), sync_status: "synced" },
    ],
    users: [
      { fayda_id: "user-1", name: "Test User", phone: "0912345678", photo_uri: "", created_at: new Date().toISOString(), updated_at: new Date().toISOString(), sync_status: "synced" },
    ],
    librarians: [
      { 
        username: "DiguwaSoft",
        full_name: "Diguwa Soft Admin",
        role: "admin",
        pin_salt: "srv-salt",
        pin_hash: "srv-hash",
        device_id: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        deleted: 0
      },
      { 
        username: "lib1",
        full_name: "Demo Librarian",
        role: "librarian",
        pin_salt: "srv-salt",
        pin_hash: "srv-hash",
        device_id: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        deleted: 0
      }
    ],
    commits: [],
  };
}
