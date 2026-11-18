import { type NextRequest, NextResponse } from "next/server";

import { runScheduledPost } from "@/discord/scheduled-post";

// Scheduled bot post (see src/discord/scheduled-post.ts). Fired by the Cloudflare
// Cron Trigger via custom-worker.ts; can also be hit manually to test.
//
// Usage:
//   POST /api/discord/post              (build + send the post)
//   POST /api/discord/post?dryRun=1     (build only; returns what would be sent)
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

  const dryRun = req.nextUrl.searchParams.get("dryRun") === "1";
  try {
    return NextResponse.json(await runScheduledPost(new Date(), { dryRun }));
  } catch (err) {
    console.error("Scheduled post error:", err);
    return NextResponse.json(
      { message: "Post failed", error: String(err) },
      { status: 500 },
    );
  }
}
