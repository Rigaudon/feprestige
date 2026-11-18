// Event kind: a placeholder greeting. Template for new kinds — copy this file,
// rename, and replace the body. A kind is just a factory: options in, PostBuilder
// out. Keep kind-specific state/fetching inside the builder so each kind stays
// self-contained and reusable by any number of registry entries.

import type { PostBuilder } from "../types";

export interface HelloWorldOptions {
  /** Text before the timestamp. */
  greeting?: string;
}

export function helloWorld(opts: HelloWorldOptions = {}): PostBuilder {
  const greeting = opts.greeting ?? "👋 Hello world from the FE Prestige bot";
  return async ({ now, event }) => {
    const unix = Math.floor(now.getTime() / 1000);
    const endsUnix = Math.floor(new Date(event.end).getTime() / 1000);
    return {
      // <t:…:F>/<t:…:R> render in each reader's own time zone.
      content: `${greeting} — scheduled post at <t:${unix}:F> (event \`${event.id}\` ends <t:${endsUnix}:R>).`,
    };
  };
}
