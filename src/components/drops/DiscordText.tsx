"use client";

import { type ReactNode, useState } from "react";

// Renders a Discord message's raw content as styled React nodes: markdown
// (**bold**, *italics*, ~~strike~~, `code`, ||spoiler||), custom emoji
// (<:name:id> -> the actual emoji image), mentions/channels as neutral chips,
// and <t:unix> timestamps as readable dates. Kept intentionally small — it
// covers what shows up in drop captions, not the full Discord grammar.
//
// Note: underscore-based italics/underline are deliberately NOT parsed, so OSRS
// item names like "twisted_bow" render literally.

// Discord custom-emoji CDN — public and non-expiring, so we can hotlink it.
function emojiUrl(id: string, animated: boolean): string {
  return `https://cdn.discordapp.com/emojis/${id}.${animated ? "gif" : "png"}`;
}

function formatTimestamp(unix: string): string {
  const d = new Date(Number(unix) * 1000);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleString();
}

function Spoiler({ children }: { children: ReactNode }) {
  const [revealed, setRevealed] = useState(false);
  return (
    <span
      role="button"
      tabIndex={0}
      onClick={() => setRevealed(true)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") setRevealed(true);
      }}
      className={`rounded bg-surface-2 transition ${
        revealed ? "" : "cursor-pointer text-transparent [filter:blur(4px)]"
      }`}
    >
      {children}
    </span>
  );
}

const chip =
  "rounded bg-accent/15 px-1 font-medium text-accent-strong whitespace-nowrap";

// Inline rules, tried in order and anchored at the start of the remaining text.
const RULES: { name: string; re: RegExp }[] = [
  { name: "code", re: /^`([^`]+)`/ },
  { name: "bolditalic", re: /^\*\*\*([\s\S]+?)\*\*\*/ },
  { name: "bold", re: /^\*\*([\s\S]+?)\*\*/ },
  { name: "italic", re: /^\*([^*\n]+?)\*/ },
  { name: "strike", re: /^~~([\s\S]+?)~~/ },
  { name: "spoiler", re: /^\|\|([\s\S]+?)\|\|/ },
  { name: "emoji", re: /^<(a)?:(\w+):(\d+)>/ },
  { name: "user", re: /^<@!?(\d+)>/ },
  { name: "role", re: /^<@&(\d+)>/ },
  { name: "channel", re: /^<#(\d+)>/ },
  { name: "timestamp", re: /^<t:(\d+)(?::[tTdDfFR])?>/ },
  { name: "url", re: /^(https?:\/\/[^\s]+)/ },
];

function parse(text: string, keyPrefix: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  let rest = text;
  let buf = "";
  let k = 0;
  const flush = () => {
    if (buf) {
      nodes.push(buf);
      buf = "";
    }
  };

  while (rest.length > 0) {
    let matched = false;
    for (const rule of RULES) {
      const m = rule.re.exec(rest);
      if (!m) continue;
      matched = true;
      flush();
      const key = `${keyPrefix}-${k++}`;

      switch (rule.name) {
        case "code":
          nodes.push(
            <code
              key={key}
              className="rounded bg-surface-2 px-1 py-0.5 font-mono text-[0.9em]"
            >
              {m[1]}
            </code>,
          );
          break;
        case "bolditalic":
          nodes.push(
            <strong key={key}>
              <em>{parse(m[1], key)}</em>
            </strong>,
          );
          break;
        case "bold":
          nodes.push(<strong key={key}>{parse(m[1], key)}</strong>);
          break;
        case "italic":
          nodes.push(<em key={key}>{parse(m[1], key)}</em>);
          break;
        case "strike":
          nodes.push(
            <span key={key} className="line-through">
              {parse(m[1], key)}
            </span>,
          );
          break;
        case "spoiler":
          nodes.push(<Spoiler key={key}>{parse(m[1], key)}</Spoiler>);
          break;
        case "emoji":
          nodes.push(
            // Tiny inline emoji — plain <img> (next/image is overkill here).
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={key}
              src={emojiUrl(m[3], Boolean(m[1]))}
              alt={`:${m[2]}:`}
              title={`:${m[2]}:`}
              loading="lazy"
              className="inline-block h-5 w-5 align-[-0.3em]"
            />,
          );
          break;
        case "user":
          nodes.push(
            <span key={key} className={chip}>
              @user
            </span>,
          );
          break;
        case "role":
          nodes.push(
            <span key={key} className={chip}>
              @role
            </span>,
          );
          break;
        case "channel":
          nodes.push(
            <span key={key} className={chip}>
              #channel
            </span>,
          );
          break;
        case "timestamp":
          nodes.push(<span key={key}>{formatTimestamp(m[1])}</span>);
          break;
        case "url":
          nodes.push(
            <a
              key={key}
              href={m[1]}
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent-strong underline underline-offset-2"
            >
              {m[1]}
            </a>,
          );
          break;
      }

      rest = rest.slice(m[0].length);
      break;
    }

    if (!matched) {
      buf += rest[0];
      rest = rest.slice(1);
    }
  }

  flush();
  return nodes;
}

export function DiscordText({ content }: { content: string }) {
  return <>{parse(content, "d")}</>;
}
