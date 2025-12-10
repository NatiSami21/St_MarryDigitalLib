// supabase/functions/sync-push/index.ts

// ------------------------------
// IMPORTS
// ------------------------------ 

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import * as bcrypt from "https://deno.land/x/bcrypt@v0.4.1/mod.ts";
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

// ------------------------------
// ENV
// ------------------------------
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// server client (full access)
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// ------------------------------
// TYPES
// ------------------------------
interface PushCommit {
  commit_id: string;
  table_name: string;
  action: string;       // "create" | "update" | "delete"
  payload: any;
  timestamp: string;    // ISO
  device_id: string;
  librarian_username: string;
}

// ------------------------------
// UTILITY: apply commit to DB
// ------------------------------
async function applyCommit(commit: PushCommit) {
  const { table_name, action, payload } = commit;

  if (table_name === "books") {
    if (action === "create") {
      return supabase.from("books").upsert(payload);
    }
    if (action === "update") {
      return supabase.from("books").update(payload).eq("book_code", payload.book_code);
    }
  }

  if (table_name === "users") {
    if (action === "create") {
      return supabase.from("users").upsert(payload);
    }
    if (action === "update") {
      return supabase.from("users").update(payload).eq("fayda_id", payload.fayda_id);
    }
  }

  if (table_name === "transactions") {
    if (action === "create") {
      return supabase.from("transactions").upsert(payload);
    }
    if (action === "update") {
      return supabase.from("transactions").update(payload).eq("tx_id", payload.tx_id);
    }
  }

  if (table_name === "librarians") {
    if (action === "update") {
      return supabase.from("librarians").update(payload).eq("username", payload.username);
    }
  }

  return { error: { message: `Unsupported table: ${table_name}` } };
}

// ------------------------------
// MAIN HANDLER
// ------------------------------
serve(async (req) => {
  try {
    const body = await req.json();

    const {
      device_id,
      librarian_username,
      commits,
    }: {
      device_id: string;
      librarian_username: string;
      commits: PushCommit[];
    } = body;

    if (!device_id || !librarian_username || !Array.isArray(commits)) {
      return new Response(JSON.stringify({
        ok: false,
        reason: "Invalid payload",
      }), { status: 400 });
    }

    // ------------------------------
    // Validate device binding
    // ------------------------------
    const { data: librarianRecord } = await supabase
      .from("librarians")
      .select("device_id, deleted")
      .eq("username", librarian_username)
      .single();

    if (!librarianRecord) {
      return Response.json({ ok: false, reason: "User not found" }, { status: 404 });
    }

    if (librarianRecord.deleted === 1) {
      return Response.json({ ok: false, reason: "User deleted" }, { status: 403 });
    }

    if (librarianRecord.device_id !== device_id) {
      return Response.json({
        ok: false,
        reason: "Device not authorized",
      }, { status: 403 });
    }

    // ------------------------------
    // APPLY COMMITS ONE BY ONE
    // ------------------------------
    const results = [];

    for (const c of commits) {
      const r = await applyCommit(c);

      // Log commit status
      await supabase.from("commits").insert({
        commit_id: c.commit_id,
        librarian_username: c.librarian_username,
        device_id: c.device_id,
        type: c.action,
        payload: JSON.stringify(c.payload),
        timestamp: c.timestamp,
        pushed: r.error ? 0 : 1,
      });

      results.push({
        commit_id: c.commit_id,
        success: !r.error,
        error: r.error?.message || null,
      });
    }

    const lastCommitTs = commits.length
      ? commits[commits.length - 1].timestamp
      : null;

    return Response.json({
      ok: true,
      applied: results,
      last_commit_timestamp: lastCommitTs,
    });

  } catch (err) {
    console.error("sync-push error:", err);

    return new Response(JSON.stringify({
      ok: false,
      reason: typeof err === "object" && err !== null && "message" in err ? (err as { message?: string }).message || "Server error" : "Server error",
    }), { status: 500 });
  }
});
