#!/usr/bin/env node
/**
 * Local companion + mobile app smoke (starts static server, runs verifiers).
 * Usage: node scripts/run-companion-smoke.mjs
 */
import { spawn } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { startLocalStaticServer } from "./local-static-server.mjs";
import { AMOJI_BUILD } from "../amoji-engine/engine/companion/buildVersion.mjs";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const port = Number(process.env.LOCAL_PORT || 0);

function runNode(relScript, env = {}, extraArgs = []) {
  const script = join(repoRoot, relScript);
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [script, ...extraArgs], {
      stdio: "inherit",
      env: { ...process.env, ...env },
      cwd: repoRoot,
    });
    child.on("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${relScript} exited ${code}`));
    });
  });
}

const host = await startLocalStaticServer(port);
const base = host.baseUrl;

try {
  process.env.MOBILE_VERIFY_BASE = base;
  process.env.LOCAL = "1";
  await runNode("scripts/mobile-app-verify.mjs", {
    MOBILE_VERIFY_BASE: base,
    LOCAL: "1",
  });

  if (process.env.FULL_SMOKE === "1") {
    const issuesUrl = `${base}/prototypes/amoji-companion.html?lang=yue&automic=0&build=${encodeURIComponent(AMOJI_BUILD)}`;
    await runNode("scripts/companion-issues-verify.mjs", {}, ["--url", issuesUrl]);
  }
} finally {
  await host.close();
}

console.log("\n✅ Companion local smoke finished");
