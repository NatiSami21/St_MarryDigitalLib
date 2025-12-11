// -- VALID IMPORTS FOR EDGE FUNCTIONS -- //
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import * as bcrypt from "https://deno.land/x/bcrypt@v0.4.1/mod.ts";
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

// ----------- CREATE SUPABASE CLIENT -----------
const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(supabaseUrl, serviceKey);

// ----------- MAIN FUNCTION -----------
serve(async (req: Request) => {
  try {
    const { username, pin, device_id } = await req.json();

    if (!username || !pin || !device_id) {
      return new Response(
        JSON.stringify({ ok: false, reason: "Missing required fields" }),
        { status: 400 }
      );
    }

    // 1. Fetch librarian
    const { data: librarian, error: libErr } = await supabase
      .from("librarians")
      .select("*")
      .eq("username", username)
      .single();

    if (libErr || !librarian) {
      return new Response(
        JSON.stringify({ ok: false, reason: "Invalid username" }),
        { status: 400 }
      );
    }
 
    // 2. Verify PIN using SHA256 (NOT bcrypt)
    async function sha256(input: string) {
      const data = new TextEncoder().encode(input);
      const hashBuffer = await crypto.subtle.digest("SHA-256", data);
      return Array.from(new Uint8Array(hashBuffer))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
    }

    const computedHash = await sha256(`${librarian.pin_salt}:${pin}`);

    if (computedHash !== librarian.pin_hash) {
      return new Response(
        JSON.stringify({ ok: false, reason: "Incorrect PIN" }),
        { status: 401 }
      );
    }


    // 3. If first login → force pin change
    const require_pin_change = librarian.pin_hash === "" || librarian.pin_salt === "";

    // 4. Bind device
    await supabase
      .from("librarians")
      .update({ device_id, updated_at: new Date().toISOString() })
      .eq("username", username);

    // 5. Fetch full snapshot
    const snapshot = await buildSnapshot();

    return new Response(
      JSON.stringify({
        ok: true,
        snapshot,
        role: librarian.role,
        require_pin_change,
        last_pulled_commit: null,
      }),
      { status: 200 }
    );
  } catch (err) {
    console.error("AUTH ACTIVATE ERROR:", err);
    return new Response(JSON.stringify({ ok: false, reason: "Server error" }), {
      status: 500,
    });
  }
});

// ----------- BUILD SNAPSHOT -----------
async function buildSnapshot() {
  const tables = ["users", "books", "librarians", "transactions", "commits"];

  const snapshot: Record<string, any[]> = {};

  for (const t of tables) {
    const { data } = await supabase.from(t).select("*");
    snapshot[t] = data ?? [];
  }

  // Add shift schedule
  snapshot["shifts"] = await getShiftsSnapshot();

  return snapshot;
}

// ----------- GET SHIFTS SNAPSHOT -----------

async function getShiftsSnapshot() {
  const { data, error } = await supabase
    .from("shifts")
    .select("*")
    .eq("deleted", 0);

  if (error) {
    console.error("SHIFT FETCH ERROR:", error);
    return [];
  }
  return data || [];
}
