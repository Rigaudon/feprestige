import { type NextRequest, NextResponse } from "next/server";

import { runRecaption, runSync, type SyncMode } from "@/discord/sync";

// Manual / scheduled trigger for the Discord -> R2 drops ingest. Gated by a
// bearer secret (DISCORD_SYNC_SECRET), mirroring the Sanity revalidate webhook.
//
// Usage:
//   POST /api/discord/sync?mode=backfill        (drain history: repeat until done)
//   POST /api/discord/sync?mode=incremental     (pull new drops)
//   Authorization: Bearer <DISCORD_SYNC_SECRET>
//
// Backfill is batched (Cloudflare subrequest cap), so re-invoke while the
// response has "done": false. Never truncates silently — the response reports
// exactly what happened.
export async function POST(req: NextRequest) {
  const secret = process.env.DISCORD_SYNC_SECRET;
  if (!secret) {
    return NextResponse.json(
      { message: "Sync not configured (DISCORD_SYNC_SECRET unset)" },
      { status: 503 },
    );
  }

  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const modeParam = req.nextUrl.searchParams.get("mode");
  const limitParam = req.nextUrl.searchParams.get("limit");
  const limit = limitParam ? Number(limitParam) : undefined;

  try {
    // Rewrite existing captions (e.g. resolve @mentions) without re-downloading.
    if (modeParam === "recaption") {
      return NextResponse.json(await runRecaption());
    }

    const mode: SyncMode =
      modeParam === "backfill" ? "backfill" : "incremental";
    const result = await runSync({
      mode,
      limit: Number.isFinite(limit) ? limit : undefined,
    });
    return NextResponse.json(result);
  } catch (err) {
    console.error("Discord sync error:", err);
    return NextResponse.json(
      { message: "Sync failed", error: String(err) },
      { status: 500 },
    );
  }
}
