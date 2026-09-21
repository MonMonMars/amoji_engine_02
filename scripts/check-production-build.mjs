#!/usr/bin/env node
/**
 * Compare live /api/health build id to repo AMOJI_BUILD.
 *
 *   node scripts/check-production-build.mjs           # exit 1 if mismatch
 *   node scripts/check-production-build.mjs --warn-only # exit 0, print warning
 */
import { AMOJI_BUILD } from "../amoji-engine/engine/companion/buildVersion.mjs";
import { DEMO_BASE_URL } from "../amoji-engine/engine/companion/deployUrls.mjs";

const warnOnly = process.argv.includes("--warn-only");
const base = (process.env.VERIFY_BASE_URL || DEMO_BASE_URL).replace(/\/$/, "");

let live = "";
try {
  const res = await fetch(`${base}/api/health`, {
    signal: AbortSignal.timeout(15000),
    headers: { "Cache-Control": "no-cache" },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();
  live = String(json.build || "");
} catch (err) {
  const msg = `Production health check failed: ${err?.message || err}`;
  if (warnOnly) {
    console.warn(`⚠️  ${msg}`);
    process.exit(0);
  }
  console.error(msg);
  process.exit(1);
}

if (live === AMOJI_BUILD) {
  console.log(`✅ Production build matches repo: ${AMOJI_BUILD}`);
  process.exit(0);
}

const detail = `production=${live} repo=${AMOJI_BUILD}`;
if (warnOnly) {
  console.warn(`⚠️  Production deploy behind repo (${detail})`);
  console.warn(
    "Set GitHub secrets VERCEL_TOKEN, VERCEL_ORG_ID, VERCEL_PROJECT_ID or fix Vercel Git deploy on main.",
  );
  process.exit(0);
}

console.error(`❌ Production deploy behind repo (${detail})`);
console.error(
  "Fix: add Vercel secrets to GitHub → Settings → Secrets, or reconnect Vercel Git integration for this repo.",
);
process.exit(1);
