
// supabase/functions/auth-activate/index.ts
// Patched, tolerant, debug-friendly auth-activate for Supabase Edge Functions

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

/**
 * NOTE:
 * - Put DEPLOY_DEBUG=true in function env when debugging locally / on staging.
 * - Ensure SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in function env.
 */

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const DEBUG = (Deno.env.get("DEPLOY_DEBUG") || "").toLowerCase() === "true";

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment!");
  // We still continue — createClient will fail later and be visible in logs.
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

/**
 * Compute SHA-256 digest and return both hex and base64 representations.
 */
async function sha256Both(input: string) {
  const enc = new TextEncoder().encode(input);
  const hashBuffer = await crypto.subtle.digest("SHA-256", enc);
  const bytes = new Uint8Array(hashBuffer);

  // hex
  const hex = Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");

  // base64
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  const base64 = btoa(binary);

  return { hex, base64 };
}

function jsonError(msg: string, status = 400) {
  return new Response(JSON.stringify({ ok: false, reason: msg }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

serve(async (req: Request) => {
  try {
    // Parse body (robust)
    let body: any;
    try {
      body = await req.json();
    } catch (e) {
      if (DEBUG) console.error("Request JSON parse error:", e);
      return jsonError("Invalid JSON body", 400);
    }

    const rawUsername = (body?.username ?? "").toString();
    const pin = (body?.pin ?? "").toString();
    const device_id = (body?.device_id ?? "").toString();

    if (!rawUsername || !pin || !device_id) {
      if (DEBUG) console.warn("Missing fields", { rawUsername, hasPin: !!pin, device_id });
      return jsonError("Missing required fields", 400);
    }

    const usernameTrimmed = rawUsername.trim();

    if (DEBUG) console.log(`Activate request for username='${usernameTrimmed}' device='${device_id}'`);

    // 1) Try exact username lookup
    let { data: librarian, error: libErr } = await supabase
      .from("librarians")
      .select("*")
      .eq("username", usernameTrimmed)
      .maybeSingle();

    // 2) fallback: case-insensitive search (ilike)
    if (!librarian) {
      const { data: ciData, error: ciErr } = await supabase
        .from("librarians")
        .select("*")
        .ilike("username", usernameTrimmed)
        .limit(1);

      if (ciErr) {
        if (DEBUG) console.error("Case-insensitive username lookup error:", ciErr);
      } else if (Array.isArray(ciData) && ciData.length > 0) {
        librarian = ciData[0];
        if (DEBUG) console.log("Found librarian via ilike fallback:", librarian.username);
      }
    }

    if (!librarian) {
      if (DEBUG) console.warn("Librarian not found for username:", usernameTrimmed);
      return jsonError("Invalid username", 400);
    }

    // Normalize stored values
    const storedSaltRaw = (librarian.pin_salt ?? "").toString().trim();
    const storedHashRaw = (librarian.pin_hash ?? "").toString().trim();

    if (!storedSaltRaw || !storedHashRaw) {
      if (DEBUG) console.warn("Stored salt/hash missing for user:", librarian.username);
      // choose to return 401 to indicate credentials can't be verified
      return jsonError("Incorrect PIN", 401);
    }

    // Compute digest of `${salt}:${pin}` in both hex and base64
    const computed = await sha256Both(`${storedSaltRaw}:${pin}`);

    const computedHex = computed.hex.toLowerCase();
    const computedB64 = computed.base64;

    const storedHashNormalized = storedHashRaw.toLowerCase();

    if (DEBUG) {
      console.log("salt (db):", storedSaltRaw);
      console.log("computedHex:", computedHex);
      console.log("computedBase64:", computedB64);
      console.log("storedHash (normalized):", storedHashNormalized);
    }

    // Comparison tolerant to hex vs base64, casing and whitespace
    const matches =
      storedHashNormalized === computedHex ||
      storedHashNormalized === computedB64.toLowerCase();

    if (!matches) {
      if (DEBUG) {
        console.warn("PIN verification failed for user:", librarian.username);
      }
      return jsonError("Incorrect PIN", 401);
    }

    // Determine require_pin_change (if you prefer field vs sentinel values)
    // Accept either explicit boolean field 'require_pin_change' or legacy logic: empty hash/salt => require
    let require_pin_change = false;
    if (typeof librarian.require_pin_change === "boolean") {
      require_pin_change = librarian.require_pin_change;
    } else {
      // legacy fallback
      require_pin_change = storedHashRaw === "" || storedSaltRaw === "";
    }

    // Bind device_id (update DB)
    try {
      const { error: updErr } = await supabase
        .from("librarians")
        .update({ device_id, updated_at: new Date().toISOString() })
        .eq("username", librarian.username);

      if (updErr) {
        if (DEBUG) console.error("Device bind update error:", updErr);
        // not fatal; continue
      } else if (DEBUG) {
        console.log(`Bound device ${device_id} to ${librarian.username}`);
      }
    } catch (e) {
      if (DEBUG) console.error("Device bind exception:", e);
    }

    // Build snapshot
    const snapshot: Record<string, any[]> = {};
    const tables = ["users", "books", "librarians", "transactions", "commits", "shifts"];
    for (const t of tables) {
      try {
        const { data, error } = await supabase.from(t).select("*");
        if (error) {
          if (DEBUG) console.error(`Snapshot fetch error for ${t}:`, error);
          snapshot[t] = [];
        } else {
          snapshot[t] = data ?? [];
        }
      } catch (e) {
        if (DEBUG) console.error(`Snapshot exception for ${t}:`, e);
        snapshot[t] = [];
      }
    }

    // Success response
    const resp = {
      ok: true,
      snapshot,
      role: librarian.role ?? "librarian",
      require_pin_change,
      last_pulled_commit: null,
    };

    if (DEBUG) console.log("Activation success for", librarian.username);

    return new Response(JSON.stringify(resp), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("AUTH-ACTIVATE unexpected error:", err);
    return jsonError("Server error", 500);
  }
});