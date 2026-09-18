#!/usr/bin/env node
/**
 * Smoke: VRMA clip crossfade + calm idle restore after wave → thinking → relax.
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

function startStaticServer(port = 0) {
  return new Promise((resolve) => {
    const server = createServer(async (req, res) => {
      try {
        const url = decodeURIComponent(req.url?.split("?")[0] || "/");
        const rel = url === "/" ? "/prototypes/vrm-motion-transition-test.html" : url;
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
  const { server, baseUrl } = await startStaticServer();
  const browser = await chromium.launch({
    headless: true,
    args: ["--use-gl=angle", "--use-angle=swiftshader"],
  });
  const page = await browser.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));

  await page.goto(`${baseUrl}/prototypes/vrm-motion-transition-test.html`, {
    waitUntil: "networkidle",
    timeout: 120000,
  });

  await page.waitForFunction(
    () => {
      const t = window.__motionTransitionTest;
      return t && (t.ready || t.error || t.skipped);
    },
    undefined,
    { timeout: 120000 },
  );
  const data = await page.evaluate(() => window.__motionTransitionTest);

  const out = {
    ok:
      (Boolean(data?.ready) || Boolean(data?.skipped)) &&
      !data?.error &&
      errors.length === 0,
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
