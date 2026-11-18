// Pre-deploy guard (wired as `predeploy` in package.json, so `npm run deploy`
// runs it first and aborts on failure). Production must always be a commit that
// exists on origin/main, so what's live can be reproduced, reviewed and rolled
// back from git — never an unpushed working tree on someone's machine.
//
// Checks: on branch `main`, no uncommitted or untracked changes, and HEAD is
// exactly origin/main after a fresh fetch (i.e. pushed, and nothing newer
// upstream that this build would silently revert).
//
// Plain Node (no bash) so it runs the same on the Mac and on the Windows build box.
// Emergency override: SKIP_DEPLOY_CHECK=1 npm run deploy

import { execFileSync } from "node:child_process";

if (process.env.SKIP_DEPLOY_CHECK === "1") {
  console.warn("⚠ SKIP_DEPLOY_CHECK=1 — deploying without the git checks.");
  process.exit(0);
}

const git = (...args) =>
  execFileSync("git", args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trimEnd();

function fail(msg) {
  console.error(`\n✘ Deploy blocked: ${msg}\n`);
  process.exit(1);
}

const branch = git("rev-parse", "--abbrev-ref", "HEAD");
if (branch !== "main") fail(`on branch "${branch}"; deploy from main.`);

const dirty = git("status", "--porcelain");
if (dirty) {
  fail(`working tree has uncommitted/untracked changes:\n${dirty}\nCommit and push them first.`);
}

try {
  git("fetch", "--quiet", "origin", "main");
} catch (err) {
  fail(`couldn't fetch origin/main to verify the push (${String(err.stderr || err).trim()}).`);
}

const head = git("rev-parse", "HEAD");
const remote = git("rev-parse", "origin/main");
if (head !== remote) {
  const ahead = git("rev-list", "--count", "origin/main..HEAD");
  const behind = git("rev-list", "--count", "HEAD..origin/main");
  fail(
    `HEAD (${head.slice(0, 7)}) ≠ origin/main (${remote.slice(0, 7)}) — ` +
      `${ahead} unpushed, ${behind} not pulled. Push/pull so they match.`,
  );
}

console.log(`✔ Deploying main @ ${head.slice(0, 7)} (matches origin/main).`);
