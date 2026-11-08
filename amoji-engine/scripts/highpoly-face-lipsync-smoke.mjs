#!/usr/bin/env node
/**
 * Smoke: high-poly VRM loads + lip sync visemes apply (Kizuna default).
 *
 * Usage:
 *   node amoji-engine/scripts/highpoly-face-lipsync-smoke.mjs
 *   node amoji-engine/scripts/highpoly-face-lipsync-smoke.mjs --model kizuna-kamatte.vrm
 */
import { chromium } from "playwright-core";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "../..");

const MIME = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".mjs": "text/javascript",
  ".vrm": "model/gltf-binary",
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
        const rel = url === "/" ? "/prototypes/vrm-highpoly-face-test.html" : url;
        const filePath = path.join(root, rel);
        const data = await readFile(filePath);
        const ext = path.extname(filePath).toLowerCase();
        const type =
          MIME[ext] ||
          (ext === ".module.js" ? "text/javascript" : "application/octet-stream");
        res.writeHead(200, {
          "Content-Type": type,
          "Access-Control-Allow-Origin": "*",
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
  const model = parseArg("--model", "kizuna-kamatte.vrm");
  const { server, baseUrl } = await startStaticServer();
  const browser = await chromium.launch({
    headless: true,
    args: ["--use-gl=angle", "--use-angle=swiftshader"],
  });
  const page = await browser.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));

  const url = `${baseUrl}/prototypes/vrm-highpoly-face-test.html?model=${encodeURIComponent(model)}&autocycle=1`;
  await page.goto(url, { waitUntil: "networkidle", timeout: 120000 });

  await page.waitForFunction(
    () => {
      const t = window.__highpolyFaceTest;
      return t && (t.ready || t.error);
    },
    undefined,
    { timeout: 120000 },
  );

  await page.click("#cycle-visemes");
  await page.waitForTimeout(900);

  const data = await page.evaluate(() => window.__highpolyFaceTest);
  const face = await page.evaluate(() => {
    const dbg = window.__highpolyFaceTest;
    return dbg;
  });

  const out = {
    ok:
      Boolean(data?.ready) &&
      !data?.error &&
      errors.length === 0 &&
      (data?.triangles || 0) > 10000 &&
      (data?.expressionCount || 0) >= 5 &&
      data?.hasVisemes === true &&
      data?.lipSyncApplied === true,
    model,
    ...data,
    errors,
    baseUrl,
  };
  console.log(JSON.stringify(out, null, 2));

  await browser.close();
  server.close();
  if (!out.ok) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
