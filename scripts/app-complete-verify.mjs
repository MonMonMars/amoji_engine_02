#!/usr/bin/env node
/**
 * Full "app complete" gate — unit tests + delivery + mobile + scene + roster.
 *
 * Usage:
 *   node scripts/app-complete-verify.mjs           # local pre-delivery + extras
 *   PRODUCTION=1 node scripts/app-complete-verify.mjs  # after deploy
 */
import { spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { AMOJI_BUILD } from "../amoji-engine/engine/companion/buildVersion.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const production = process.env.PRODUCTION === "1";
const artifactDir = process.env.ARTIFACT_DIR || "/opt/cursor/artifacts";
mkdirSync(artifactDir, { recursive: true });

/** @type {{ step: string, ok: boolean, detail?: string }[]} */
const steps = [];

function run(name, cmd, args, opts = {}) {
  const r = spawnSync(cmd, args, {
    cwd: opts.cwd || root,
    env: { ...process.env, ...(opts.env || {}) },
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    shell: Boolean(opts.shell),
  });
  const ok = r.status === 0;
  const detail = ok
    ? (r.stdout || "").trim().split("\n").slice(-2).join(" | ")
    : (r.stderr || r.stdout || "").trim().slice(-600);
  steps.push({ step: name, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? `\n    ${detail}` : ""}`);
  return ok;
}

console.log(
  `\n=== App complete verify — ${AMOJI_BUILD} (${production ? "production" : "local"}) ===\n`,
);

run("sync-build-version", process.execPath, ["scripts/sync-build-version.mjs"]);
run("unit-tests", "npm", ["test"], {
  cwd: join(root, "amoji-engine"),
  shell: true,
});

if (production) {
  run("production-build", process.execPath, ["scripts/check-production-build.mjs"]);
  run("pre-delivery-prod", process.execPath, ["scripts/pre-delivery-verify.mjs"], {
    env: { PRODUCTION: "1" },
  });
  run("roster-models-prod", process.execPath, ["scripts/verify-roster-models.mjs"]);
  run("mobile-prod", process.execPath, ["scripts/mobile-app-verify.mjs"]);
} else {
  run("pre-delivery-local", process.execPath, ["scripts/pre-delivery-verify.mjs"]);
  run("mobile-local", process.execPath, ["scripts/run-companion-smoke.mjs"], {
    env: { FULL_SMOKE: "1" },
  });
  run("scene-shortcuts", process.execPath, ["scripts/scene-shortcuts-demo-verify.mjs"]);
}

const failed = steps.filter((s) => !s.ok);
const report = {
  build: AMOJI_BUILD,
  mode: production ? "production" : "local",
  passed: steps.length - failed.length,
  failed: failed.length,
  steps,
};
writeFileSync(
  join(artifactDir, "app-complete-verify.json"),
  JSON.stringify(report, null, 2),
);

console.log(`\n=== Summary: ${report.passed}/${steps.length} passed ===`);
if (failed.length) {
  console.error("\n❌ App complete verify FAILED:");
  for (const f of failed) console.error(`  - ${f.step}`);
  process.exit(1);
}
console.log("\n✅ App complete verify PASSED — companion app delivery gate OK.\n");
