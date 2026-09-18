#!/usr/bin/env node
/**
 * Smoke: Kizuna loads in full companion UI and lip sync API responds.
 *
 * Usage:
 *   node scripts/companion-kizuna-lipsync-smoke.mjs --url http://127.0.0.1:5203/...
 */
import { chromium } from "playwright-core";
import { beginStartPickerSession } from "./companion-picker-smoke-util.mjs";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

const MIME = {
  ".html": "text/html",
  ".css": "text/css",
  ".js": "text/javascript",
  ".mjs": "text/javascript",
  ".vrm": "model/gltf-binary",
  ".png": "image/png",
  ".json": "application/json",
};

function parseArg(name, fallback) {
  const idx = process.argv.indexOf(name);
  if (idx >= 0 && process.argv[idx + 1]) return process.argv[idx + 1];
  return fallback;
}

function startStaticServer(port = 0) {
  return new Promise((resolve) => {
    const server = createServer(async (req, res) => {
      try {
        const url = decodeURIComponent(req.url?.split("?")[0] || "/");
        const rel = url === "/" ? "/prototypes/amoji-companion.html" : url;
        const filePath = path.join(root, rel);
        const data = await readFile(filePath);
        const ext = path.extname(filePath).toLowerCase();
        const type =
          MIME[ext] ||
          (ext === ".module.js" ? "text/javascript" : "application/octet-stream");
        res.writeHead(200, {
          "Content-Type": type,
          "Access-Control-Allow-Origin": "*",
          "Cache-Control": "no-store",
        });
        res.end(data);
      } catch (err) {
        res.writeHead(404);
        res.end(String(err?.message || err));
      }
    });
    server.listen(port, "127.0.0.1", () => {
      const addr = server.address();
      resolve({ server, baseUrl: `http://127.0.0.1:${addr.port}` });
    });
  });
}

async function main() {
  const externalUrl = parseArg("--url", "");
  const { server, baseUrl } = externalUrl
    ? { server: null, baseUrl: externalUrl.replace(/\/$/, "") }
    : await startStaticServer();

  const browser = await chromium.launch({
    headless: true,
    args: ["--use-gl=angle", "--use-angle=swiftshader"],
  });
  const page = await browser.newPage({ viewport: { width: 900, height: 1200 } });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));

  const url = new URL(`${baseUrl}/prototypes/amoji-companion.html`);
  url.searchParams.set("character", "kizuna");
  url.searchParams.set("automic", "0");
  url.searchParams.set("lang", "en");

  await page.goto(url.toString(), { waitUntil: "domcontentloaded", timeout: 90000 });
  await beginStartPickerSession(page, {
    characterId: "kizuna",
    cardTimeout: 30000,
    dismissTimeout: 120000,
  });

  await page.waitForFunction(
    () => window.__amojiAvatarKind === "vrm3d" && window.__amojiAvatar?.getFaceReport,
    undefined,
    { timeout: 120000 },
  );

  const report = await page.evaluate(async () => {
    const avatar = window.__amojiAvatar;
    avatar.setEating?.(false);
    avatar.setTalking(true);
    avatar.setMouthShape("aa");
    avatar.setMouthOpen(0.82);
    for (let i = 0; i < 120; i += 1) {
      avatar.update?.(1 / 60);
      await new Promise((r) => requestAnimationFrame(r));
    }
    const face = avatar.getFaceDebug?.() || {};
    const load = avatar.getFaceReport?.() || {};
    return {
      build: window.__amojiBuild,
      avatarKind: window.__amojiAvatarKind,
      faceReportWindow: window.__amojiFaceReport?.triangleCount ?? null,
      triangles: load.triangleCount,
      hasVisemes: load.hasVisemes,
      mouthPresets: load.mouthPresets,
      talking: face.talking,
      mouthOpen: face.mouthOpen,
      mouthTarget: face.mouthTarget,
      activeViseme: face.activeViseme,
      activeVisemePreset: face.activeVisemePreset,
    };
  });

  const mouthOk =
    (report.mouthOpen || 0) > 0.35 || (report.mouthTarget || 0) > 0.75;

  const out = {
    ok:
      !errors.length &&
      report.avatarKind === "vrm3d" &&
      (report.triangles || 0) > 50000 &&
      report.hasVisemes === true &&
      report.talking === true &&
      mouthOk &&
      report.activeViseme === "aa" &&
      (report.faceReportWindow || 0) > 50000,
    ...report,
    errors,
    url: url.toString(),
  };
  console.log(JSON.stringify(out, null, 2));

  await browser.close();
  server?.close();
  if (!out.ok) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
