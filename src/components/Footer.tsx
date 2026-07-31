import type { Settings } from "@/sanity/types";

// Site footer. Social links and footer text are editable in Site Settings.
export function Footer({ settings }: { settings: Settings | null }) {
  const year = 2026; // Build-stamped; update if you want a live year.
  const socials = settings?.socialLinks?.filter((s) => s.url && s.platform) ?? [];

  return (
    <footer className="mt-auto border-t border-white/10">
      <div className="mx-auto flex max-w-5xl flex-col items-center gap-3 px-4 py-8 text-sm text-neutral-400 sm:flex-row sm:justify-between">
        <p>
          © {year} {settings?.title || "Clan Site"}
          {settings?.footerText ? ` · ${settings.footerText}` : ""}
        </p>

        {socials.length > 0 ? (
          <div className="flex gap-4">
            {socials.map((s) => (
              <a
                key={s.url}
                href={s.url}
                target="_blank"
                rel="noopener noreferrer"
                className="transition-colors hover:text-white"
              >
                {s.platform}
              </a>
            ))}
          </div>
        ) : null}
      </div>
    </footer>
  );
}
