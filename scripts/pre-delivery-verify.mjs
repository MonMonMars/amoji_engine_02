#!/usr/bin/env node
/**
 * Mandatory gate before telling the user a build is fixed or live.
 *
 * Usage:
 *   node scripts/pre-delivery-verify.mjs           # local server + all checks
 *   PRODUCTION=1 node scripts/pre-delivery-verify.mjs  # after deploy
 */
import { spawn, spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { join as pathJoin } from "node:path";
import { fileURLToPath } from "node:url";
import { AMOJI_BUILD } from "../amoji-engine/engine/companion/buildVersion.mjs";
import { companionBuildPath } from "../amoji-engine/engine/companion/companionFreshBoot.js";

const root = pathJoin(fileURLToPath(new URL(".", import.meta.url)), "..");
const production = process.env.PRODUCTION === "1";
const preferredPort = Number(process.env.LOCAL_PORT || 5174);
const artifactDir = process.env.ARTIFACT_DIR || "/opt/cursor/artifacts";
mkdirSync(artifactDir, { recursive: true });

/** @type {{ step: string, ok: boolean, detail?: string }[]} */
const steps = [];

function runStepSync(name, cmd, args, opts = {}) {
  const { cwd = root, env = {} } = opts;
  const r = spawnSync(cmd, args, {
    cwd,
    env: { ...process.env, ...env },
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  const ok = r.status === 0;
  const detail = ok
    ? (r.stdout || "").trim().split("\n").slice(-3).join(" | ")
    : (r.stderr || r.stdout || "").trim().slice(-800);
  steps.push({ step: name, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? `\n    ${detail}` : ""}`);
  return ok;
}

function runStepAsync(name, cmd, args, opts = {}) {
  const { cwd = root, env = {} } = opts;
  return new Promise((resolve) => {
    const child = spawn(cmd, args, {
      cwd,
      env: { ...process.env, ...env },
      stdio: ["ignore", "pipe", "pipe"],
    });
    let out = "";
    child.stdout?.on("data", (d) => {
      out += d;
    });
    child.stderr?.on("data", (d) => {
      out += d;
    });
    child.on("close", (code) => {
      const ok = code === 0;
      const detail = ok
        ? out.trim().split("\n").slice(-3).join(" | ")
        : out.trim().slice(-800);
      steps.push({ step: name, ok, detail });
      console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? `\n    ${detail}` : ""}`);
      resolve(ok);
    });
  });
}

async function probePort(port) {
  try {
    const res = await fetch(`http://127.0.0.1:${port}/api/health`, {
      signal: AbortSignal.timeout(2000),
    });
    if (!res.ok) return false;
    const j = await res.json();
    return j.build === AMOJI_BUILD;
  } catch {
    return false;
  }
}

async function startVerifyServer(port) {
  return new Promise((resolve, reject) => {
    const child = spawn(
      process.execPath,
      ["scripts/companion-verify-server.mjs", "--port", String(port)],
      { cwd: root, stdio: ["ignore", "pipe", "pipe"] },
    );
    let started = false;
    const timer = setTimeout(() => {
      if (!started) {
        child.kill("SIGTERM");
        reject(new Error(`verify server did not start on ${port}`));
      }
    }, 15000);
    child.stdout?.on("data", (chunk) => {
      if (String(chunk).includes(`verify-server:${port}`)) {
        started = true;
        clearTimeout(timer);
        resolve(child);
      }
    });
    child.on("error", reject);
    child.on("exit", (code) => {
      if (!started) {
        clearTimeout(timer);
        reject(new Error(`verify server exited ${code}`));
      }
    });
  });
}

async function resolveLocalServer() {
  for (let port = preferredPort; port < preferredPort + 12; port += 1) {
    if (await probePort(port)) {
      return { port, child: null, base: `http://127.0.0.1:${port}` };
    }
  }
  for (let port = preferredPort; port < preferredPort + 12; port += 1) {
    try {
      const child = await startVerifyServer(port);
      if (await probePort(port)) {
        return { port, child, base: `http://127.0.0.1:${port}` };
      }
      child.kill("SIGTERM");
    } catch (err) {
      if (err?.message?.includes("EADDRINUSE")) continue;
      if (String(err).includes("did not start")) continue;
    }
  }
  throw new Error(`No free verify server port in ${preferredPort}-${preferredPort + 11}`);
}

console.log(`\n=== Pre-delivery verify — build ${AMOJI_BUILD} (${production ? "production" : "local"}) ===\n`);

let serverChild = null;
let base = "https://temporary-rushing-oxygen-ok5jzhd.vercel.app";

if (!production) {
  try {
    const local = await resolveLocalServer();
    base = local.base;
    serverChild = local.child;
    const health = await fetch(`${base}/api/health`).then((r) => r.json());
    if (health.build !== AMOJI_BUILD) {
      throw new Error(
        `verify server build mismatch (${health.build} != ${AMOJI_BUILD})`,
      );
    }
    steps.push({ step: "local-server", ok: true, detail: String(local.port) });
    console.log(`PASS  local-server — ${local.base}`);
  } catch (err) {
    steps.push({ step: "local-server", ok: false, detail: String(err?.message || err) });
    console.log(`FAIL  local-server — ${err?.message || err}`);
  }
}

const playPath = companionBuildPath(AMOJI_BUILD, "full");
const playQs = new URLSearchParams({
  lang: "en",
  pick: "1",
  automic: "0",
  build: AMOJI_BUILD,
});
const playUrl = `${base}${playPath}?${playQs.toString()}`;

runStepSync("unit-tests", "npm", ["test"], {
  cwd: pathJoin(root, "amoji-engine"),
});

if (production) {
  await runStepAsync("production-demo-link", "node", ["scripts/demo-link-verify.mjs"], {
    env: { ARTIFACT_DIR: artifactDir },
  });
} else if (steps.find((s) => s.step === "local-server")?.ok) {
  await runStepAsync("local-demo-link", "node", ["scripts/demo-link-verify.mjs"], {
    env: {
      LOCAL: "1",
      VERIFY_BASE_URL: base,
      ARTIFACT_DIR: artifactDir,
    },
  });
}

await runStepAsync("picker-e2e", "node", [
  "scripts/companion-picker-verify.mjs",
  "--url",
  playUrl,
], { env: { ARTIFACT_DIR: artifactDir } });

await runStepAsync("reported-issues-e2e", "node", [
  "scripts/companion-issues-verify.mjs",
  "--url",
  playUrl,
], { env: { ARTIFACT_DIR: artifactDir } });

if (serverChild) {
  serverChild.kill("SIGTERM");
}

const failed = steps.filter((s) => !s.ok);
writeFileSync(
  pathJoin(artifactDir, "pre-delivery-verify.json"),
  JSON.stringify({ build: AMOJI_BUILD, production, steps }, null, 2),
);

console.log(`\n=== Summary: ${steps.length - failed.length}/${steps.length} passed ===`);
if (failed.length) {
  console.error("\n❌ Pre-delivery verify FAILED — do not share demo links until fixed:");
  for (const f of failed) console.error(`  - ${f.step}`);
  process.exit(1);
}
console.log("\n✅ Pre-delivery verify PASSED — safe to deliver to user.\n");
