import { type NextRequest, NextResponse } from "next/server";

import { runWikiSync, type WikiSyncMode } from "@/wiki/sync";

// Manual / scheduled trigger for the OSRS Wiki Sync -> R2 combat achievements
// ingest. Gated by DISCORD_SYNC_SECRET — despite the name that is the site's
// single shared ingest secret, reused here so the handoff has one fewer
// credential in it rather than two that must be rotated together.
//
// Usage:
//   POST /api/wiki/sync                 (advance one batch through the roster)
//   POST /api/wiki/sync?batch=5         (smaller batch, e.g. when testing)
//   POST /api/wiki/sync?mode=rescore    (recompute from stored data, no fetches)
//   Authorization: Bearer <DISCORD_SYNC_SECRET>
//
// One run covers `batch` members, so a full pass over the roster takes several
// runs — the cron drives it. The response reports exactly what happened.
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

  const mode: WikiSyncMode =
    req.nextUrl.searchParams.get("mode") === "rescore" ? "rescore" : "refresh";
  const batchParam = req.nextUrl.searchParams.get("batch");
  const batch = batchParam ? Number(batchParam) : undefined;

  try {
    const result = await runWikiSync({
      mode,
      batch: Number.isFinite(batch) ? batch : undefined,
    });
    return NextResponse.json(result);
  } catch (err) {
    console.error("Wiki sync error:", err);
    return NextResponse.json(
      { message: "Sync failed", error: String(err) },
      { status: 500 },
    );
  }
}
