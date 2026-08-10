// One-off: swap a Discord role A -> B for every member who currently has role A.
// Each affected member has role A removed and role B added in a single atomic
// PATCH. Defaults to a DRY RUN (prints who would change); pass --commit to apply.
//
// The bot needs Manage Roles (admin covers it) AND its own top role must sit
// ABOVE both roles A and B (role hierarchy applies even with Administrator).
// Listing members over REST also requires the "Server Members Intent" to be
// enabled in the Developer Portal (Bot -> Privileged Gateway Intents).
//
// Run (token via env is cleanest; it's the same DISCORD_BOT_TOKEN the app uses):
//   DISCORD_BOT_TOKEN=... node scripts/swap-discord-role.mjs guilds
//   DISCORD_BOT_TOKEN=... node scripts/swap-discord-role.mjs roles <guildId>
//   DISCORD_BOT_TOKEN=... node scripts/swap-discord-role.mjs swap <guildId> <fromRoleId> <toRoleId>            (dry run, default)
//   DISCORD_BOT_TOKEN=... node scripts/swap-discord-role.mjs swap <guildId> <fromRoleId> <toRoleId> --dry-run  (explicit dry run)
//   DISCORD_BOT_TOKEN=... node scripts/swap-discord-role.mjs swap <guildId> <fromRoleId> <toRoleId> --commit   (apply)
//
// Consolidate MANY old roles into one new role: members holding ANY of the listed
// old roles have all of them removed and the new role added. Target role comes
// first, then the old roles to fold in:
//   DISCORD_BOT_TOKEN=... node scripts/swap-discord-role.mjs consolidate <guildId> <newRoleId> <oldRoleId...>            (dry run)
//   DISCORD_BOT_TOKEN=... node scripts/swap-discord-role.mjs consolidate <guildId> <newRoleId> <oldRoleId...> --commit   (apply)
//
// Delete this file when you're done.

// Node's global fetch (undici) ignores HTTP(S)_PROXY. On networks that require a
// proxy (e.g. the corporate box), route requests through it so discord.com is
// reachable. No-op when no proxy is configured, so this stays portable.
const proxy = process.env.HTTPS_PROXY || process.env.https_proxy;
if (proxy) {
  const { setGlobalDispatcher, ProxyAgent } = await import("undici");
  setGlobalDispatcher(new ProxyAgent(proxy));
}

const API = "https://discord.com/api/v10";
const UA = "FE Prestige clan site (github.com/feprestige)";

const token = process.env.DISCORD_BOT_TOKEN;
if (!token) {
  console.error(
    "Missing token. Run:\n  DISCORD_BOT_TOKEN=... node scripts/swap-discord-role.mjs <mode> ...",
  );
  process.exit(1);
}

// Authenticated Discord REST call. Retries on 429 using the server's delay, then
// throws on any non-2xx. Returns parsed JSON, or null for 204 No Content.
async function api(path, { method = "GET", body, reason } = {}) {
  for (let attempt = 0; attempt < 5; attempt++) {
    const headers = {
      Authorization: `Bot ${token}`,
      "User-Agent": UA,
    };
    if (body) headers["Content-Type"] = "application/json";
    if (reason) headers["X-Audit-Log-Reason"] = reason;

    const res = await fetch(`${API}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    if (res.status === 429) {
      const retryAfter = Number(res.headers.get("retry-after") ?? "1");
      await new Promise((r) => setTimeout(r, (retryAfter + 0.5) * 1000));
      continue;
    }
    if (!res.ok) {
      throw new Error(`Discord ${res.status} ${method} ${path}: ${await res.text()}`);
    }
    return res.status === 204 ? null : await res.json();
  }
  throw new Error(`Repeatedly rate-limited: ${method} ${path}`);
}

// Page through every guild member (1000 at a time). Requires the Server Members
// Intent to be enabled for the bot.
async function allMembers(guildId) {
  const members = [];
  let after = "0";
  for (;;) {
    const page = await api(
      `/guilds/${guildId}/members?limit=1000&after=${after}`,
    );
    if (!page.length) break;
    members.push(...page);
    after = page[page.length - 1].user.id;
    if (page.length < 1000) break;
  }
  return members;
}

async function listGuilds() {
  const guilds = await api("/users/@me/guilds");
  for (const g of guilds) console.log(`${g.id}  ${g.name}`);
}

async function listRoles(guildId) {
  const roles = await api(`/guilds/${guildId}/roles`);
  roles.sort((a, b) => b.position - a.position);

  // Best-effort member counts per role (needs the Server Members Intent). If the
  // list comes back empty/errors, fall back to showing roles without counts.
  const counts = new Map();
  let counted = false;
  try {
    const members = await allMembers(guildId);
    if (members.length) {
      counted = true;
      for (const m of members) {
        for (const rid of m.roles) counts.set(rid, (counts.get(rid) ?? 0) + 1);
      }
    }
  } catch {
    // ignore — show roles without counts
  }

  for (const r of roles) {
    const count = counted ? `  ${String(counts.get(r.id) ?? 0).padStart(4)} members` : "";
    console.log(`${r.id}  pos:${String(r.position).padStart(3)}${count}  ${r.name}`);
  }
  if (!counted) {
    console.log(
      "\n(no member counts — enable the Server Members Intent in the Developer Portal)",
    );
  }
}

async function swap(guildId, fromId, toId, commit) {
  // Resolve role names up front so the confirmation is human-readable.
  const roles = await api(`/guilds/${guildId}/roles`);
  const from = roles.find((r) => r.id === fromId);
  const to = roles.find((r) => r.id === toId);
  if (!from) throw new Error(`fromRoleId ${fromId} not found in guild.`);
  if (!to) throw new Error(`toRoleId ${toId} not found in guild.`);

  const members = await allMembers(guildId);
  const affected = members.filter((m) => m.roles.includes(fromId));

  console.log(
    `Swap "${from.name}" (${fromId}) -> "${to.name}" (${toId})\n` +
      `${members.length} members scanned, ${affected.length} have "${from.name}".\n`,
  );

  if (!commit) {
    for (const m of affected) {
      const name = m.user.global_name || m.user.username;
      const already = m.roles.includes(toId) ? "  (already has target)" : "";
      console.log(`  would change: ${name} (${m.user.id})${already}`);
    }
    console.log(
      `\nDRY RUN — nothing changed. Re-run with --commit to apply to ${affected.length} member(s).`,
    );
    return;
  }

  let done = 0;
  for (const m of affected) {
    const next = m.roles.filter((r) => r !== fromId);
    if (!next.includes(toId)) next.push(toId);
    await api(`/guilds/${guildId}/members/${m.user.id}`, {
      method: "PATCH",
      body: { roles: next },
      reason: `One-off role swap ${from.name} -> ${to.name}`,
    });
    done++;
    const name = m.user.global_name || m.user.username;
    console.log(`  [${done}/${affected.length}] ${name}`);
    // Gentle throttle to stay well under per-guild write limits.
    await new Promise((r) => setTimeout(r, 250));
  }
  console.log(`\nDone. Updated ${done} member(s).`);
}

async function consolidate(guildId, toId, fromIds, commit) {
  const roles = await api(`/guilds/${guildId}/roles`);
  const to = roles.find((r) => r.id === toId);
  if (!to) throw new Error(`newRoleId ${toId} not found in guild.`);
  const froms = fromIds.map((id) => {
    const r = roles.find((x) => x.id === id);
    if (!r) throw new Error(`oldRoleId ${id} not found in guild.`);
    return r;
  });
  const fromSet = new Set(fromIds);

  const members = await allMembers(guildId);
  const affected = members.filter((m) => m.roles.some((r) => fromSet.has(r)));

  console.log(
    `Consolidate into "${to.name}" (${toId})\n` +
      `Folding in: ${froms.map((r) => `"${r.name}"`).join(", ")}\n` +
      `${members.length} members scanned, ${affected.length} hold at least one old role.\n`,
  );
  // Per-old-role breakdown so the counts are auditable before committing.
  for (const r of froms) {
    const n = members.filter((m) => m.roles.includes(r.id)).length;
    console.log(`  ${String(n).padStart(4)}  ${r.name} (${r.id})`);
  }
  console.log("");

  if (!commit) {
    for (const m of affected) {
      const name = m.user.global_name || m.user.username;
      const held = froms.filter((r) => m.roles.includes(r.id)).map((r) => r.name);
      const already = m.roles.includes(toId) ? "  (already has target)" : "";
      console.log(`  would change: ${name} (${m.user.id}) [${held.join(", ")}]${already}`);
    }
    console.log(
      `\nDRY RUN — nothing changed. Re-run with --commit to apply to ${affected.length} member(s).`,
    );
    return;
  }

  let done = 0;
  for (const m of affected) {
    const next = m.roles.filter((r) => !fromSet.has(r));
    if (!next.includes(toId)) next.push(toId);
    await api(`/guilds/${guildId}/members/${m.user.id}`, {
      method: "PATCH",
      body: { roles: next },
      reason: `One-off role consolidation into ${to.name}`,
    });
    done++;
    const name = m.user.global_name || m.user.username;
    console.log(`  [${done}/${affected.length}] ${name}`);
    await new Promise((r) => setTimeout(r, 250));
  }
  console.log(`\nDone. Updated ${done} member(s).`);
}

async function main() {
  const [mode, ...rest] = process.argv.slice(2);
  // Dry run is the default (safe). It only applies when --commit is passed and
  // --dry-run is not; --dry-run makes the intent explicit and wins over --commit.
  const commit = rest.includes("--commit") && !rest.includes("--dry-run");
  const args = rest.filter((a) => !a.startsWith("--"));

  switch (mode) {
    case "guilds":
      return listGuilds();
    case "roles":
      if (!args[0]) throw new Error("Usage: roles <guildId>");
      return listRoles(args[0]);
    case "swap":
      if (args.length < 3)
        throw new Error(
          "Usage: swap <guildId> <fromRoleId> <toRoleId> [--dry-run | --commit]",
        );
      return swap(args[0], args[1], args[2], commit);
    case "consolidate":
      if (args.length < 3)
        throw new Error(
          "Usage: consolidate <guildId> <newRoleId> <oldRoleId...> [--dry-run | --commit]",
        );
      return consolidate(args[0], args[1], args.slice(2), commit);
    default:
      console.error(
        "Modes:\n" +
          "  guilds\n" +
          "  roles       <guildId>\n" +
          "  swap        <guildId> <fromRoleId> <toRoleId> [--dry-run | --commit]\n" +
          "  consolidate <guildId> <newRoleId> <oldRoleId...> [--dry-run | --commit]",
      );
      process.exit(1);
  }
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
