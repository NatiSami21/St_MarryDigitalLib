// supabase/functions/sync-pull/index.ts

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ENV
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

serve(async (req) => {
  try {
    const { device_id, librarian_username, last_pulled_commit } = await req.json();

    if (!device_id || !librarian_username) {
      return Response.json({ ok: false, reason: "Missing fields" }, { status: 400 });
    }

    // ============================================================
    // 1. VALIDATE LIBRARIAN + DEVICE BINDING
    // ============================================================
    const { data: lib, error: libErr } = await supabase
      .from("librarians")
      .select("device_id, deleted")
      .eq("username", librarian_username)
      .single();

    if (libErr || !lib) {
      return Response.json({ ok: false, reason: "User not found" }, { status: 404 });
    }

    if (lib.deleted === 1) {
      return Response.json({ ok: false, reason: "User deleted" }, { status: 403 });
    }

    if (lib.device_id !== device_id) {
      return Response.json({ ok: false, reason: "Device mismatch" }, { status: 403 });
    }

    // ============================================================
    // 2. FULL SNAPSHOT ON FIRST PULL
    // ============================================================
    const isFirstPull = !last_pulled_commit;

    if (isFirstPull) {
      console.log("📥 Full snapshot requested");

      const [books, users, librarians, transactions] = await Promise.all([
        supabase.from("books").select("*"),
        supabase.from("users").select("*"),
        supabase.from("librarians").select("*"),
        supabase.from("transactions").select("*"),
      ]);

      return Response.json({
        ok: true,
        snapshot: {
          books: books.data ?? [],
          users: users.data ?? [],
          librarians: librarians.data ?? [],
          transactions: transactions.data ?? [],
          pending_commits: [],                // rarely used
          last_pulled_commit: new Date().toISOString()
        },
        serverTime: new Date().toISOString(),
      });
    }

    // ============================================================
    // 3. INCREMENTAL CHANGES
    // ============================================================
    const since = last_pulled_commit;

    const [books, users, librarians, transactions] = await Promise.all([
      supabase.from("books").select("*").gte("updated_at", since),
      supabase.from("users").select("*").gte("updated_at", since),
      supabase.from("librarians").select("*").gte("updated_at", since),
      supabase.from("transactions").select("*").gte("updated_at", since),
    ]);

    // ============================================================
    // 4. CLOUD pending commits (rare case)
    // ============================================================
    const { data: pendingCloudCommits } = await supabase
      .from("pending_commits")
      .select("*")
      .eq("synced", 0);

    return Response.json({
      ok: true,
      snapshot: {
        books: books.data ?? [],
        users: users.data ?? [],
        librarians: librarians.data ?? [],
        transactions: transactions.data ?? [],
        pending_commits: pendingCloudCommits ?? [],
        last_pulled_commit: new Date().toISOString(),
      },
      serverTime: new Date().toISOString(),
    });

  } catch (err) {
    console.error("sync-pull error:", err);
    const reason = typeof err === "object" && err !== null && "message" in err
      ? (err as { message?: string }).message || "Server error"
      : "Server error";
    return Response.json({ ok: false, reason }, { status: 500 });
  }
});
