#!/usr/bin/env node
/**
 * Load several roster characters and assert VRM URL matches character id.
 *
 *   npm run verify:roster-models
 *   LOCAL=1 npm run verify:roster-models
 *   VERIFY_BASE_URL=https://… npm run verify:roster-models
 */
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { join, dirname } from "node:path";
import { AMOJI_BUILD } from "../amoji-engine/engine/companion/buildVersion.mjs";
import { startLocalStaticServer } from "./local-static-server.mjs";
import { DEMO_BASE_URL } from "../amoji-engine/engine/companion/deployUrls.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const ids = ["nova", "kizuna", "alicia", "ember", "rex", "nana", "yuki"];

let base = process.env.VERIFY_BASE_URL?.replace(/\/$/, "") || "";
let host = null;
const local = process.env.LOCAL === "1";

if (!base) {
  if (local) {
    host = await startLocalStaticServer(0);
    base = host.baseUrl;
    for (let i = 0; i < 20; i += 1) {
      try {
        const h = await fetch(`${base}/api/health`, { signal: AbortSignal.timeout(3000) });
        if (h.ok) break;
      } catch {
        /* retry */
      }
      await new Promise((r) => setTimeout(r, 250));
    }
  } else {
    base = DEMO_BASE_URL.replace(/\/$/, "");
  }
}

const playBase = local
  ? `${base}/prototypes/amoji-companion.html?lang=en&pick=1&automic=0&build=${encodeURIComponent(AMOJI_BUILD)}`
  : `${base}/play?lang=en&pick=1&automic=0&build=${encodeURIComponent(AMOJI_BUILD)}`;

let failed = 0;

for (const id of ids) {
  const r = spawnSync(
    process.execPath,
    [
      join(root, "scripts/companion-character-model-smoke.mjs"),
      "--url",
      playBase,
      "--character",
      id,
    ],
    { cwd: root, encoding: "utf8", timeout: 240000 },
  );
  let parsed = null;
  try {
    const raw = (r.stdout || "").trim();
    const start = raw.indexOf("{");
    if (start >= 0) parsed = JSON.parse(raw.slice(start));
  } catch {
    parsed = null;
  }
  const pass = r.status === 0 && parsed?.ok === true;
  if (!pass) {
    failed += 1;
    const err =
      (r.stderr || "").trim().split("\n").pop() ||
      JSON.stringify(parsed?.report || parsed) ||
      "unknown";
    console.error(`FAIL  ${id} — ${err}`);
  } else {
    const url = parsed.report?.loadedModelUrl || "";
    console.log(`PASS  ${id} — ${url.slice(0, 96)}`);
  }
}

if (host) await host.close();
if (failed) process.exit(1);
console.log(`\n✅ Roster model verify — ${ids.length - failed}/${ids.length} passed (${local ? "local" : "production"})\n`);
