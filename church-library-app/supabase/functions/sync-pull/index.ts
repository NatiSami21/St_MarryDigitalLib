// supabase/functions/sync-pull/index.ts

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

serve(async (req) => {
  try {
    const { device_id, librarian_username, last_pulled_commit } = await req.json();

    if (!device_id || !librarian_username) {
      return Response.json({ ok: false, reason: "Missing fields" }, { status: 400 });
    }

    // -----------------------------------------------------
    // VALIDATE LIBRARIAN AND DEVICE
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
      return Response.json({ ok: false, reason: "Device mismatch" }, { status: 403 });

    const now = new Date().toISOString();

    // -----------------------------------------------------
    // FIRST PULL = SEND FULL SNAPSHOT
    // -----------------------------------------------------
    if (!last_pulled_commit) {
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
          pending_commits: [],
          last_pulled_commit: now,
        },
        serverTime: now,
      });
    }

    // -----------------------------------------------------
    // INCREMENTAL SYNC
    // -----------------------------------------------------
    const since = last_pulled_commit;

    const [books, users, librarians, transactions] = await Promise.all([
      supabase.from("books").select("*").gte("updated_at", since),
      supabase.from("users").select("*").gte("updated_at", since),
      supabase.from("librarians").select("*").gte("updated_at", since),
      supabase.from("transactions").select("*").gte("updated_at", since),
    ]);

    // cloud pending commits (usually none after fix)
    const { data: cloudCommits } = await supabase
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
        pending_commits: cloudCommits ?? [],
        last_pulled_commit: now,
      },
      serverTime: now,
    });

  } catch (err) {
    console.error("sync-pull error:", err);
    const errorMessage = err instanceof Error ? err.message : "Server error";
    return Response.json(
      { ok: false, reason: errorMessage },
      { status: 500 }
    );
  }
});
