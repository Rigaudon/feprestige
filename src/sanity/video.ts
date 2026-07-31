// Turns an editor-pasted YouTube/Vimeo link into a privacy-friendly embed URL.
// Used both by the Studio (validating the pasted URL) and by the site (rendering
// the iframe), so it lives here rather than in either one.

export interface VideoEmbedInfo {
  provider: "youtube" | "vimeo";
  embedUrl: string;
}

function youtube(id: string): VideoEmbedInfo {
  // -nocookie avoids setting tracking cookies until the visitor hits play.
  return { provider: "youtube", embedUrl: `https://www.youtube-nocookie.com/embed/${id}` };
}

function vimeo(id: string, hash?: string): VideoEmbedInfo {
  // hash (`h=`) is required for unlisted/private Vimeo videos.
  return {
    provider: "vimeo",
    embedUrl: `https://player.vimeo.com/video/${id}${hash ? `?h=${hash}` : ""}`,
  };
}

// Returns embed info for a supported URL, or null if it isn't one we recognize.
export function parseVideoUrl(input: string): VideoEmbedInfo | null {
  let url: URL;
  try {
    url = new URL(input.trim());
  } catch {
    return null;
  }

  const host = url.hostname.replace(/^www\./, "").replace(/^m\./, "");
  const parts = url.pathname.split("/").filter(Boolean);

  // YouTube: youtu.be/ID, youtube.com/watch?v=ID, /embed/ID, /shorts/ID, /v/ID
  if (host === "youtu.be") {
    return parts[0] ? youtube(parts[0]) : null;
  }
  if (host === "youtube.com" || host === "youtube-nocookie.com") {
    const v = url.searchParams.get("v");
    if (v) return youtube(v);
    if (["embed", "shorts", "v"].includes(parts[0]) && parts[1]) {
      return youtube(parts[1]);
    }
    return null;
  }

  // Vimeo: vimeo.com/ID, vimeo.com/ID/HASH, vimeo.com/channels/x/ID,
  // player.vimeo.com/video/ID (optionally with ?h=HASH)
  if (host === "vimeo.com" || host === "player.vimeo.com") {
    const numeric = parts.filter((p) => /^\d+$/.test(p));
    const id = numeric[numeric.length - 1];
    if (!id) return null;
    const idIndex = parts.lastIndexOf(id);
    const hash = url.searchParams.get("h") || parts[idIndex + 1] || undefined;
    return vimeo(id, hash);
  }

  return null;
}
