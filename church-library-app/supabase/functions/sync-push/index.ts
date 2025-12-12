// supabase/functions/sync-push/index.ts

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ENV
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

/* ---------------------------------------------------------
 * TYPES
 * --------------------------------------------------------*/
interface PushCommit {
  commit_id: string;
  table_name: string;
  action: "create" | "update" | "delete";
  payload: any;
  timestamp: string;    // ISO string
  librarian_username: string;
  device_id: string;
}

/* ---------------------------------------------------------
 * APPLY COMMIT ON DB
 * --------------------------------------------------------*/
async function applyCommit(commit: PushCommit) {
  const { table_name, action, payload } = commit;

  // ensure updated_at exists
  if (payload && !payload.updated_at) {
    payload.updated_at = new Date().toISOString();
  }

  switch (table_name) {
    case "books":
      if (action === "create") return supabase.from("books").insert(payload);
      if (action === "update") return supabase.from("books").update(payload).eq("book_code", payload.book_code);
      if (action === "delete") return supabase.from("books").delete().eq("book_code", payload.book_code);
      break;

    case "users":
      if (action === "create") return supabase.from("users").insert(payload);
      if (action === "update") return supabase.from("users").update(payload).eq("fayda_id", payload.fayda_id);
      if (action === "delete") return supabase.from("users").delete().eq("fayda_id", payload.fayda_id);
      break;

    case "transactions":
      if (action === "create") return supabase.from("transactions").insert(payload);
      if (action === "update") return supabase.from("transactions").update(payload).eq("tx_id", payload.tx_id);
      if (action === "delete") return supabase.from("transactions").delete().eq("tx_id", payload.tx_id);
      break;

    case "librarians":
      if (action === "create") return supabase.from("librarians").insert(payload);
      if (action === "update") return supabase.from("librarians").update(payload).eq("username", payload.username);
      if (action === "delete") return supabase.from("librarians").delete().eq("username", payload.username);
      break;

    default:
      return { error: { message: `Unsupported table: ${table_name}` } };
  }
}

/* ---------------------------------------------------------
 * MAIN ROUTE
 * --------------------------------------------------------*/
serve(async (req) => {
  try {
    const body = await req.json();
    const { device_id, librarian_username, commits } = body;

    if (!device_id || !librarian_username || !Array.isArray(commits)) {
      return Response.json({ ok: false, reason: "Invalid payload" }, { status: 400 });
    }

    // -----------------------------------------------------
    // VALIDATE LIBRARIAN + DEVICE
    // -----------------------------------------------------
    const { data: librarian, error: libErr } = await supabase
      .from("librarians")
      .select("device_id, deleted")
      .eq("username", librarian_username)
      .single();

    if (libErr || !librarian)
      return Response.json({ ok: false, reason: "User not found" }, { status: 404 });

    if (librarian.deleted === 1)
      return Response.json({ ok: false, reason: "User deleted" }, { status: 403 });

    if (librarian.device_id !== device_id)
      return Response.json({ ok: false, reason: "Device not authorized" }, { status: 403 });

    // -----------------------------------------------------
    // APPLY COMMITS
    // -----------------------------------------------------
    const appliedResults = [];

    for (const commit of commits) {
      const result = await applyCommit(commit);

      // Write commit log
      await supabase.from("commits").insert({
        commit_id: commit.commit_id,
        librarian_username: commit.librarian_username,
        device_id: commit.device_id,
        type: commit.action,
        payload: JSON.stringify(commit.payload),
        timestamp: commit.timestamp,
        pushed: result.error ? 0 : 1,
      });

      appliedResults.push({
        commit_id: commit.commit_id,
        success: !result.error,
        error: result.error?.message ?? null,
      });
    }

    const lastCommitTs = commits.length ? commits[commits.length - 1].timestamp : null;

    return Response.json({
      ok: true,
      applied: appliedResults,
      last_commit_timestamp: lastCommitTs,
    });

  } catch (err) {
    console.error("sync-push error:", err);

    return Response.json({
      ok: false,
      reason: err instanceof Error ? err.message : "Server error",
    }, { status: 500 });
  }
});
