// supabase/functions/sync-push/index.ts

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

interface PushCommit {
  commit_id: string;
  table_name: string;
  action: "insert" | "create" | "update" | "delete" | "clock_in" | "clock_out";
  payload: any;
  timestamp: number;
  librarian_username: string;
  device_id: string;
}

/**
 * Check whether a timestamp is inside ANY valid shift
 * for the given librarian username.
 *
 * Server-authoritative enforcement.
 */
async function isTimestampInsideShift(
  username: string,
  timestamp: number
): Promise<boolean> {
  const commitTime = new Date(timestamp).getTime();

  const { data: shifts, error } = await supabase
    .from("shifts")
    .select("start_time, end_time")
    .eq("librarian_username", username)
    .eq("deleted", false);

  if (error) {
    console.error("❌ Shift query failed:", error);
    return false;
  }

  if (!shifts || shifts.length === 0) {
    return false;
  }

  for (const shift of shifts) {
    const start = new Date(shift.start_time).getTime();
    const end = new Date(shift.end_time).getTime();

    if (commitTime >= start && commitTime <= end) {
      return true;
    }
  }

  return false;
}


/* ---------------- APPLY COMMIT ---------------- */

async function applyCommit(commit: PushCommit) {
  console.log("📦 APPLY COMMIT:", commit);

  const { table_name } = commit;
  let payload = commit.payload;

  // Normalize action
  const action = commit.action === "insert" ? "create" : commit.action;

  // Ensure updated_at exists
  if (payload && !payload.updated_at) {
    payload.updated_at = new Date().toISOString();
  }

  let result: any = null;

  switch (table_name) {
    /* ---------- LIBRARIANS ---------- */
    case "librarians": {
      if (action === "create") {
        result = await supabase.from("librarians").insert(payload);
      }
      if (action === "update") {
        result = await supabase
          .from("librarians")
          .update(payload)
          .eq("username", payload.username);
      }
      if (action === "delete") {
        result = await supabase
          .from("librarians")
          .delete()
          .eq("username", payload.username);
      }
      break;
    }

    /* ---------- BOOKS ---------- */
    case "books": {
      if (action === "create") {
        result = await supabase.from("books").insert(payload);
      }
      if (action === "update") {
        result = await supabase
          .from("books")
          .update(payload)
          .eq("book_code", payload.book_code);
      }
      if (action === "delete") {
        result = await supabase
          .from("books")
          .delete()
          .eq("book_code", payload.book_code);
      }
      break;
    }

    /* ---------- USERS ---------- */
    case "users": {
      if (action === "create") {
        result = await supabase.from("users").insert(payload);
      }
      if (action === "update") {
        result = await supabase
          .from("users")
          .update(payload)
          .eq("fayda_id", payload.fayda_id);
      }
      if (action === "delete") {
        result = await supabase
          .from("users")
          .delete()
          .eq("fayda_id", payload.fayda_id);
      }
      break;
    }

    /* ---------- TRANSACTIONS ---------- */
    case "transactions": {
      if (action === "create") {
        result = await supabase.from("transactions").insert(payload);
      }
      if (action === "update") {
        result = await supabase
          .from("transactions")
          .update(payload)
          .eq("tx_id", payload.tx_id);
      }
      if (action === "delete") {
        result = await supabase
          .from("transactions")
          .delete()
          .eq("tx_id", payload.tx_id);
      }
      break;
    }

    /* ---------- SHIFTS (CRITICAL FIX) ---------- */
    case "shifts": {
      const fixedPayload = {
        ...payload,
        created_at: new Date(payload.created_at).toISOString(),
        updated_at: new Date(payload.updated_at).toISOString(),
      };

      if (action === "create") {
        result = await supabase.from("shifts").insert(fixedPayload);
      }

      if (action === "update") {
        result = await supabase
          .from("shifts")
          .update(fixedPayload)
          .eq("id", payload.id);
      }
      break;
    }

    /* ---------- SHIFT ATTENDANCE ---------- */
    case "shift_attendance": {
      if (action === "create") {
        result = await supabase
          .from("shift_attendance")
          .insert(payload);
      }

      if (action === "clock_in") {
        result = await supabase
          .from("shift_attendance")
          .update({
            clock_in: payload.clock_in,
            status: "in_progress",
            updated_at: new Date().toISOString(),
          })
          .eq("shift_id", payload.shift_id)
          .eq("librarian_username", payload.librarian_username);
      }

      if (action === "clock_out") {
        result = await supabase
          .from("shift_attendance")
          .update({
            clock_out: payload.clock_out,
            status: "completed",
            updated_at: new Date().toISOString(),
          })
          .eq("shift_id", payload.shift_id)
          .eq("librarian_username", payload.librarian_username);
      }

      break;
    }



    /* ---------- UNSUPPORTED ---------- */
    default: {
      console.error("❌ UNSUPPORTED TABLE:", table_name);
      return { error: { message: `Unsupported table: ${table_name}` } };
    }
  }

  if (!result) {
    console.warn("⚠️ NO SUPABASE OP EXECUTED FOR:", table_name);
  } else {
    console.log("📝 SUPABASE RESULT:", result);
  }

  return result;
}

/* ---------------- HTTP HANDLER ---------------- */

serve(async (req) => {
  try {
    const body = await req.json();
    console.log("🚀 sync-push received:", body);

    const { device_id, librarian_username, commits } = body;

    if (!device_id || !librarian_username || !Array.isArray(commits)) {
      return Response.json(
        { ok: false, reason: "Invalid payload" },
        { status: 400 }
      );
    }

    const { data: librarian, error: librarianError } = await supabase
      .from("librarians")
      .select("device_id, deleted, role")
      .eq("username", librarian_username)
      .single();

    if (librarianError) {
      console.error("❌ Librarian query error:", librarianError);
      return Response.json(
        { ok: false, reason: "User not found" },
        { status: 404 }
      );
    }

    if (!librarian) {
      return Response.json(
        { ok: false, reason: "User not found" },
        { status: 404 }
      );
    }

    if (librarian.deleted === 1) {
      return Response.json(
        { ok: false, reason: "User deleted" },
        { status: 403 }
      );
    }

    if (librarian.device_id !== device_id) {
      return Response.json(
        { ok: false, reason: "Device not authorized" },
        { status: 403 }
      );
    }

    const applied: any[] = [];

    for (const commit of commits) {
      
      /* ---------- SERVER AUTHORITY SHIFT CHECK ---------- */
      
      if (librarian.role === "librarian") {
        const valid = await isTimestampInsideShift(
          commit.librarian_username,
          commit.timestamp
        );

        if (!valid) {
          console.warn("⛔ COMMIT REJECTED (OUTSIDE SHIFT):", {
            commit_id: commit.commit_id,
            user: commit.librarian_username,
            timestamp: commit.timestamp,
          });

          await supabase.from("commits").insert({
            commit_id: commit.commit_id,
            librarian_username: commit.librarian_username,
            device_id: commit.device_id,
            type: commit.action,
            payload: JSON.stringify(commit.payload),
            timestamp: commit.timestamp,
            pushed: 0,
            rejection_reason: "outside_shift_window",
          });

          applied.push({
            commit_id: commit.commit_id,
            success: false,
            error: "Commit rejected: outside shift window",
          });

          continue;
        }
      }

      /* ---------- APPLY COMMIT ---------- */
      const result = await applyCommit(commit);

      await supabase.from("commits").insert({
        commit_id: commit.commit_id,
        librarian_username: commit.librarian_username,
        device_id: commit.device_id,
        type: commit.action,
        payload: JSON.stringify(commit.payload),
        timestamp: commit.timestamp,
        pushed: result?.error ? 0 : 1,
      });

      applied.push({
        commit_id: commit.commit_id,
        success: !result?.error,
        error: result?.error?.message ?? null,
      });
    }

    return Response.json({
      ok: true,
      applied,
      last_commit_timestamp: commits.at(-1)?.timestamp ?? null,
    });

  } catch (error) {
    console.error("❌ sync-push fatal error:", error);
    return Response.json(
      { ok: false, reason: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
});