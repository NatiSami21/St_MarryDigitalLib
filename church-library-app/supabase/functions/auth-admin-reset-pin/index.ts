import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

async function hashPin(pin: string, salt: string) {
  const data = new TextEncoder().encode(`${salt}:${pin}`);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash))
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");
}

serve(async (req) => {
  try {
    const { username, new_pin } = await req.json();

    if (!username || !new_pin) {
      return Response.json({ ok: false, reason: "missing_fields" }, { status: 400 });
    }

    const salt = crypto.randomUUID().replace(/-/g, "").slice(0, 32);
    const hash = await hashPin(new_pin, salt);

    const { error } = await supabase
      .from("librarians")
      .update({
        pin_salt: salt,
        pin_hash: hash,
        require_pin_change: true, // 🔴 FORCE
        device_id: null,          // 🔴 UNBIND
        updated_at: new Date().toISOString(),
      })
      .eq("username", username);

    if (error) {
      console.error(error);
      return Response.json({ ok: false, reason: "update_failed" }, { status: 500 });
    }

    return Response.json({ ok: true });
  } catch (e) {
    console.error(e);
    return Response.json({ ok: false, reason: "server_error" }, { status: 500 });
  }
});
