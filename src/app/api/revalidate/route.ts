import { revalidateTag } from "next/cache";
import { type NextRequest, NextResponse } from "next/server";
import { parseBody } from "next-sanity/webhook";

import { SANITY_TAG } from "@/sanity/client";

// Sanity webhook target. Configure a webhook in Sanity (manage.sanity.io ->
// API -> Webhooks) pointing here with the same secret as SANITY_REVALIDATE_SECRET.
// On any publish, this refreshes the site's cached content.
//
// Suggested webhook projection so we know which type changed:
//   { "_type": _type, "slug": slug.current }
type WebhookBody = {
  _type?: string;
  slug?: string;
};

export async function POST(req: NextRequest) {
  try {
    const { isValidSignature, body } = await parseBody<WebhookBody>(
      req,
      process.env.SANITY_REVALIDATE_SECRET,
    );

    if (!isValidSignature) {
      return NextResponse.json(
        { message: "Invalid signature" },
        { status: 401 },
      );
    }

    // Refresh everything via the global tag (small site — simple and correct),
    // plus the specific type tag when present. 'max' serves stale content while
    // fresh content regenerates in the background (recommended for CMS content).
    revalidateTag(SANITY_TAG, "max");
    if (body?._type) revalidateTag(body._type, "max");

    return NextResponse.json({
      revalidated: true,
      type: body?._type ?? null,
    });
  } catch (err) {
    console.error("Revalidation webhook error:", err);
    return NextResponse.json(
      { message: "Error revalidating" },
      { status: 500 },
    );
  }
}
