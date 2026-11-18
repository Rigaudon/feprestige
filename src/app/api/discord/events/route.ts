import { type NextRequest, NextResponse } from "next/server";

import { runDueEvents } from "@/discord/events/run";

// Scheduled Discord events (see src/discord/events/). Fired every minute by the
// Cloudflare cron via custom-worker.ts, which passes the tick's scheduled time as
// `at`; each event's own window + crontab decides whether it posts.
//
// Usage:
//   POST /api/discord/events                         (run events due now)
//   POST /api/discord/events?at=2026-11-20T20:00Z    (evaluate as of a time)
//   POST /api/discord/events?dryRun=1                (build, don't send)
//   POST /api/discord/events?event=<id>&force=1      (post one event now,
//                                                     ignoring window/crontab)
//   Authorization: Bearer <DISCORD_SYNC_SECRET>
export async function POST(req: NextRequest) {
  const secret = process.env.DISCORD_SYNC_SECRET;
  if (!secret) {
    return NextResponse.json(
      { message: "Not configured (DISCORD_SYNC_SECRET unset)" },
      { status: 503 },
    );
  }
  if (req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const q = req.nextUrl.searchParams;
  const atParam = q.get("at");
  // Accept epoch ms (what the cron passes) or any Date-parseable string.
  const at = atParam
    ? new Date(/^\d+$/.test(atParam) ? Number(atParam) : atParam)
    : new Date();
  if (Number.isNaN(at.getTime())) {
    return NextResponse.json({ message: `Invalid at "${atParam}"` }, { status: 400 });
  }

  try {
    const results = await runDueEvents(at, {
      dryRun: q.get("dryRun") === "1",
      only: q.get("event") ?? undefined,
      force: q.get("force") === "1",
    });
    return NextResponse.json({ at: at.toISOString(), results });
  } catch (err) {
    console.error("Discord events error:", err);
    return NextResponse.json(
      { message: "Events run failed", error: String(err) },
      { status: 500 },
    );
  }
}
