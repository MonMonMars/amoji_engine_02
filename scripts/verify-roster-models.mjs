#!/usr/bin/env node
/**
 * Load several roster characters and assert VRM URL matches character id.
 *
 *   npm run verify:roster-models
 *   LOCAL=1 npm run verify:roster-models
 *   VERIFY_BASE_URL=https://… npm run verify:roster-models
 */
import { AMOJI_BUILD } from "../amoji-engine/engine/companion/buildVersion.mjs";
import { startLocalStaticServer } from "./local-static-server.mjs";
import { DEMO_BASE_URL } from "../amoji-engine/engine/companion/deployUrls.mjs";
import { runCompanionCharacterModelSmoke } from "./companion-character-model-smoke.mjs";

/** Current roster samples (legacy ?character=rex maps to rin — not a roster card id). */
const ids = ["nova", "kizuna", "alicia", "ember", "mei", "rin", "yuki"];

let base = process.env.VERIFY_BASE_URL?.replace(/\/$/, "") || "";
let host = null;
const local = process.env.LOCAL === "1";

if (!base) {
  if (local) {
    host = await startLocalStaticServer(0);
    base = host.baseUrl;
    let ready = false;
    for (let i = 0; i < 40; i += 1) {
      try {
        const h = await fetch(`${base}/api/health`, { signal: AbortSignal.timeout(3000) });
        const page = await fetch(`${base}/prototypes/amoji-companion.html`, {
          signal: AbortSignal.timeout(8000),
        });
        if (h.ok && page.ok) {
          ready = true;
          break;
        }
      } catch {
        /* retry */
      }
      await new Promise((r) => setTimeout(r, 250));
    }
    if (!ready) {
      console.error("FAIL  local static server did not become ready");
      process.exit(1);
    }
  } else {
    base = DEMO_BASE_URL.replace(/\/$/, "");
  }
}

const playBase = `${base}/play?lang=en&pick=1&automic=0&build=${encodeURIComponent(AMOJI_BUILD)}`;

let failed = 0;

for (const id of ids) {
  try {
    const parsed = await runCompanionCharacterModelSmoke({
      baseUrl: playBase,
      characterId: id,
    });
    if (parsed.ok) {
      const url = parsed.report?.loadedModelUrl || "";
      console.log(`PASS  ${id} — ${String(url).slice(0, 96)}`);
    } else {
      failed += 1;
      console.error(
        `FAIL  ${id} — ${JSON.stringify(parsed.report || parsed).slice(0, 160)}`,
      );
    }
  } catch (err) {
    failed += 1;
    const msg = err?.message || String(err);
    console.error(`FAIL  ${id} — ${msg.split("\n")[0]}`);
  }
}

if (host) await host.close();
if (failed) process.exit(1);
console.log(
  `\n✅ Roster model verify — ${ids.length - failed}/${ids.length} passed (${local ? "local" : "production"})\n`,
);
