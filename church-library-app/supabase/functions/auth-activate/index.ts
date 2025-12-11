// ============================================================
//  AUTH-ACTIVATE EDGE FUNCTION  (FINAL PATCHED VERSION)
// ============================================================

// ✔ Only valid imports for Supabase Edge Runtime
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

// ============================================================
//  CREATE SUPABASE CLIENT (SERVICE ROLE)
// ============================================================

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(supabaseUrl, serviceKey);

// ============================================================
//  SHA-256 HASH (salt:pin)
// ============================================================

async function sha256(input: string) {
  const data = new TextEncoder().encode(input);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// ============================================================
//  MAIN HANDLER
// ============================================================

serve(async (req: Request) => {
  try {
    const body = await req.json();
    const { username, pin, device_id } = body;

    // Basic validation
    if (!username || !pin || !device_id) {
      return jsonError("Missing required fields", 400);
    }

    // ------------------------------------------------------------
    // 1. Fetch librarian
    // ------------------------------------------------------------
    const { data: librarian, error: libErr } = await supabase
      .from("librarians")
      .select("*")
      .eq("username", username)
      .single();

    if (libErr || !librarian) {
      return jsonError("Invalid username", 400);
    }

    // ------------------------------------------------------------
    // 2. Verify PIN using SHA-256(salt:pin)
    // ------------------------------------------------------------
    const expectedHash = await sha256(`${librarian.pin_salt}:${pin}`);

    if (expectedHash !== librarian.pin_hash) {
      return jsonError("Incorrect PIN", 401);
    }

    // ------------------------------------------------------------
    // 3. Determine if user must change PIN
    //
    // REQUIREMENT:
    //   A boolean field "require_pin_change" must be in DB.
    //   - true  → force change now
    //   - false → normal login
    // ------------------------------------------------------------
    const require_pin_change = librarian.require_pin_change === true;

    // ------------------------------------------------------------
    // 4. Bind device to librarian (trust non-admin accounts too)
    // ------------------------------------------------------------

    await supabase
      .from("librarians")
      .update({
        device_id: device_id,
        updated_at: new Date().toISOString(),
      })
      .eq("username", username);

    // ------------------------------------------------------------
    // 5. Build full database snapshot
    // ------------------------------------------------------------
    const snapshot = await buildSnapshot();

    // ------------------------------------------------------------
    // 6. Return success response
    // ------------------------------------------------------------
    return new Response(
      JSON.stringify({
        ok: true,
        snapshot,
        role: librarian.role,
        require_pin_change,
        last_pulled_commit: null,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    console.error("AUTH ACTIVATE ERROR:", err);
    return jsonError("Server error", 500);
  }
});

// ============================================================
//  BUILD SNAPSHOT (clean & correct)
// ============================================================

async function buildSnapshot() {
  const snapshot: Record<string, any[]> = {};

  const tables = [
    "users",
    "books",
    "librarians",
    "transactions",
    "commits",
  ];

  for (const t of tables) {
    const { data, error } = await supabase.from(t).select("*");

    if (error) {
      console.error(`SNAPSHOT ERROR on table ${t}`, error);
      snapshot[t] = [];
    } else {
      snapshot[t] = data ?? [];
    }
  }

  // ---- SHIFTS (only non-deleted) ----
  const { data: shiftData, error: shiftErr } = await supabase
    .from("shifts")
    .select("*")
    .eq("deleted", 0);

  if (shiftErr) {
    console.error("SHIFT FETCH ERROR:", shiftErr);
    snapshot["shifts"] = [];
  } else {
    snapshot["shifts"] = shiftData ?? [];
  }

  return snapshot;
}

// ============================================================
//  JSON ERROR RESPONSE HELPER
// ============================================================

function jsonError(message: string, status = 400) {
  return new Response(JSON.stringify({ ok: false, reason: message }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
