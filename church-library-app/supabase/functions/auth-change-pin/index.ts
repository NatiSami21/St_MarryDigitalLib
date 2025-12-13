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
    const { username, old_pin, new_pin, device_id } = await req.json();

    if (!username || !new_pin || !device_id) {
      return Response.json({ ok: false, reason: "missing_fields" }, { status: 400 });
    }

    const { data: lib } = await supabase
      .from("librarians")
      .select("*")
      .eq("username", username)
      .single();

    if (!lib) return Response.json({ ok: false, reason: "user_not_found" });

    if (lib.device_id !== device_id) {
      return Response.json({ ok: false, reason: "device_mismatch" }, { status: 403 });
    }

    // verify old PIN (temporary)
    const oldHash = await hashPin(old_pin, lib.pin_salt);
    if (oldHash !== lib.pin_hash) {
      return Response.json({ ok: false, reason: "invalid_old_pin" });
    }

    const salt = crypto.randomUUID().replace(/-/g, "").slice(0, 32);
    const hash = await hashPin(new_pin, salt);

    await supabase
      .from("librarians")
      .update({
        pin_salt: salt,
        pin_hash: hash,
        require_pin_change: false,
        updated_at: new Date().toISOString(),
      })
      .eq("username", username);

    return Response.json({ ok: true });
  } catch (e) {
    console.error(e);
    return Response.json({ ok: false, reason: "server_error" }, { status: 500 });
  }
});
