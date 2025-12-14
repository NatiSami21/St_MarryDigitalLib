// supabase/functions/auth-admin-delete-librarian/index.ts

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

function jsonError(reason: string, status = 400) {
  return new Response(JSON.stringify({ ok: false, reason }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  try {
    const { admin_username, target_username, device_id } = await req.json();

    if (!admin_username || !target_username || !device_id) {
      return jsonError("Missing fields");
    }

    // --------------------------------------------------
    // 1. Validate admin
    // --------------------------------------------------
    const { data: admin } = await supabase
      .from("librarians")
      .select("role, device_id, deleted")
      .eq("username", admin_username)
      .single();

    if (!admin) return jsonError("Admin not found", 404);
    if (admin.deleted === 1) return jsonError("Admin deleted", 403);
    if (admin.role !== "admin") return jsonError("Not authorized", 403);
    if (admin.device_id !== device_id)
      return jsonError("Device mismatch", 403);

    // --------------------------------------------------
    // 2. Validate target librarian
    // --------------------------------------------------
    const { data: target } = await supabase
      .from("librarians")
      .select("username, deleted")
      .eq("username", target_username)
      .single();

    if (!target) return jsonError("Target not found", 404);
    if (target.deleted === 1)
      return jsonError("Already deleted", 409);

    
    // --------------------------------------------------
    // 3. Disable delete of last admin librarian
    // --------------------------------------------------
    // Count active admins
    const { count: adminCount } = await supabase
    .from("librarians")
    .select("*", { count: "exact", head: true })
    .eq("role", "admin")
    .eq("deleted", 0);

    if (target.role === "admin" && adminCount === 1) {
    return Response.json(
        { ok: false, reason: "Cannot delete the last admin" },
        { status: 400 }
    );
    }
    



    // --------------------------------------------------
    // 4. Soft delete + revoke device
    // --------------------------------------------------
    const { error: updErr } = await supabase
      .from("librarians")
      .update({
        deleted: 1,
        device_id: null,
        require_pin_change: true,
        updated_at: new Date().toISOString(),
      })
      .eq("username", target_username);

    if (updErr) {
      console.error("Delete librarian error:", updErr);
      return jsonError("Delete failed", 500);
    }

    // --------------------------------------------------
    // 5. Audit commit
    // --------------------------------------------------
    await supabase.from("commits").insert({
      commit_id: crypto.randomUUID(),
      librarian_username: admin_username,
      device_id,
      type: "delete",
      payload: JSON.stringify({
        target: target_username,
        soft_delete: true,
      }),
      timestamp: new Date().toISOString(),
      pushed: 1,
    });

    return new Response(
      JSON.stringify({ ok: true, deleted: target_username }),
      { headers: { "Content-Type": "application/json" } }
    );

  } catch (err) {
    console.error("auth-admin-delete-librarian error:", err);
    return jsonError("Server error", 500);
  }
});
