// supabase/functions/sync-push/index.ts

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

interface PushCommit {
  commit_id: string;
  table_name: string;
  action: "create" | "update" | "delete";
  payload: any;
  timestamp: string;
  librarian_username: string;
  device_id: string;
}

async function applyCommit(commit: PushCommit) {
  const { table_name, action, payload } = commit;

  console.log("📦 APPLY COMMIT:", {
    table_name,
    action,
    payload,
  });

  if (!payload.updated_at) {
    payload.updated_at = new Date().toISOString();
  }

  let result;

  switch (table_name) {
    case "books":
      if (action === "create") result = await supabase.from("books").insert(payload);
      if (action === "update") result = await supabase.from("books").update(payload).eq("book_code", payload.book_code);
      if (action === "delete") result = await supabase.from("books").delete().eq("book_code", payload.book_code);
      break;

    case "users":
      if (action === "create") result = await supabase.from("users").insert(payload);
      if (action === "update") result = await supabase.from("users").update(payload).eq("fayda_id", payload.fayda_id);
      if (action === "delete") result = await supabase.from("users").delete().eq("fayda_id", payload.fayda_id);
      break;

    case "transactions":
      if (action === "create") result = await supabase.from("transactions").insert(payload);
      if (action === "update") result = await supabase.from("transactions").update(payload).eq("tx_id", payload.tx_id);
      if (action === "delete") result = await supabase.from("transactions").delete().eq("tx_id", payload.tx_id);
      break;

    case "librarians":
      if (action === "create") result = await supabase.from("librarians").insert(payload);
      if (action === "update") result = await supabase.from("librarians").update(payload).eq("username", payload.username);
      if (action === "delete") result = await supabase.from("librarians").delete().eq("username", payload.username);
      break;

    default:
      console.log("❌ UNSUPPORTED TABLE:", table_name);
      return { error: { message: `Unsupported table: ${table_name}` } };
  }

  console.log("📝 SUPABASE RESULT:", result);

  return result;
}

serve(async (req) => {
  try {
    const body = await req.json();
    const { device_id, librarian_username, commits } = body;

    console.log("🚀 sync-push received:", body);

    if (!device_id || !librarian_username || !Array.isArray(commits)) {
      return Response.json({ ok: false, reason: "Invalid payload" }, { status: 400 });
    }

    const { data: librarian } = await supabase
      .from("librarians")
      .select("device_id, deleted")
      .eq("username", librarian_username)
      .single();

    if (!librarian)
      return Response.json({ ok: false, reason: "User not found" }, { status: 404 });

    if (librarian.deleted === 1)
      return Response.json({ ok: false, reason: "User deleted" }, { status: 403 });

    if (librarian.device_id !== device_id)
      return Response.json({ ok: false, reason: "Device not authorized" }, { status: 403 });

    const results = [];

    for (const commit of commits) {
      const r = await applyCommit(commit);

      await supabase.from("commits").insert({
        commit_id: commit.commit_id,
        librarian_username: commit.librarian_username,
        device_id: commit.device_id,
        type: commit.action,
        payload: JSON.stringify(commit.payload),
        timestamp: commit.timestamp,
        pushed: r.error ? 0 : 1,
      });

      results.push({
        commit_id: commit.commit_id,
        success: !r.error,
        error: r.error?.message || null,
      });
    }

    return Response.json({
      ok: true,
      applied: results,
      last_commit_timestamp: commits.at(-1)?.timestamp ?? null,
    });

  } catch (err) {
    console.error("❌ sync-push error:", err);
    return Response.json({ ok: false, reason: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
});
