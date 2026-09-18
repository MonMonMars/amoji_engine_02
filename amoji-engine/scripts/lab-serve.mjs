#!/usr/bin/env node
/**
 * Static file server for Amoji demos + optional LLM chat proxy.
 * Serves the repository root so `../amoji-engine/engine/` imports resolve.
 *
 * Usage (from amoji-engine/):
 *   npm run lab
 *
 * Cloud (no local PC): deploy to Vercel — see DEPLOY.md
 */
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  corsHeaders,
  getLlmStatusPayload,
  getOllamaTagsPayload,
  processChatRequest,
} from "../engine/companion/chatApiHandler.mjs";
import { searchWeb } from "../engine/companion/companionWebSearch.mjs";
import { processTtsRequest } from "../engine/companion/ttsHandler.mjs";
import { AMOJI_BUILD } from "../engine/companion/buildVersion.mjs";
import {
  buildPlayRedirectLocation,
  FRESH_HTML_HEADERS,
  rewriteCompanionServePath,
} from "../engine/companion/companionFreshBoot.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "../..");
const DEFAULT_PORT = 5173;

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".glb": "model/gltf-binary",
  ".vrm": "model/vnd.vrm",
  ".wav": "audio/wav",
  ".map": "application/json",
  ".md": "text/markdown; charset=utf-8",
};

function parsePort(argv) {
  const idx = argv.indexOf("--port");
  if (idx >= 0 && argv[idx + 1]) return Number(argv[idx + 1]) || DEFAULT_PORT;
  const eq = argv.find((a) => a.startsWith("--port="));
  if (eq) return Number(eq.split("=")[1]) || DEFAULT_PORT;
  return DEFAULT_PORT;
}

function safeJoin(root, urlPath) {
  const decoded = decodeURIComponent((urlPath || "/").split("?")[0]);
  const cleaned = decoded.replace(/\\/g, "/");
  const rel = cleaned === "/" ? "" : cleaned.replace(/^\/+/, "");
  const full = path.normalize(path.join(root, rel));
  if (!full.startsWith(root)) return null;
  return full;
}

function send(res, status, body, headers = {}) {
  const payload =
    typeof body === "string" || Buffer.isBuffer(body)
      ? body
      : JSON.stringify(body);
  res.writeHead(status, headers);
  res.end(payload);
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => {
      try {
        const raw = Buffer.concat(chunks).toString("utf8") || "{}";
        resolve(JSON.parse(raw));
      } catch (err) {
        reject(err);
      }
    });
    req.on("error", reject);
  });
}

async function handleChatApi(req, res) {
  try {
    const body = await readJson(req);
    const result = await processChatRequest(body);
    const status =
      result.ok === false && result.error === "empty message" ? 400 : 200;
    send(res, status, result, {
      ...corsHeaders(),
      "Content-Type": "application/json; charset=utf-8",
    });
  } catch (err) {
    send(
      res,
      500,
      { ok: false, error: err?.message || String(err) },
      { ...corsHeaders(), "Content-Type": "application/json; charset=utf-8" },
    );
  }
}

const port = parsePort(process.argv.slice(2));

const server = http.createServer(async (req, res) => {
  const cors = corsHeaders();
  for (const [key, value] of Object.entries(cors)) {
    res.setHeader(key, value);
  }

  if (req.method === "OPTIONS") {
    send(res, 204, "");
    return;
  }

  const url = new URL(req.url || "/", `http://127.0.0.1:${port}`);

  if (
    (req.method === "GET" || req.method === "HEAD") &&
    (url.pathname === "/play" ||
      url.pathname === "/play/" ||
      url.pathname === "/go" ||
      url.pathname === "/go/")
  ) {
    const location = buildPlayRedirectLocation(url.search, { build: AMOJI_BUILD });
    send(res, 303, "", { ...FRESH_HTML_HEADERS, Location: location });
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/chat") {
    await handleChatApi(req, res);
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/search") {
    try {
      const body = await readJson(req);
      const query = String(body.query || body.message || "").trim();
      if (!query) {
        send(res, 400, { ok: false, error: "empty query" }, {
          ...corsHeaders(),
          "Content-Type": "application/json; charset=utf-8",
        });
        return;
      }
      const result = await searchWeb(query, fetch);
      send(res, 200, {
        ok: result.ok,
        summary: result.summary,
        source: result.source,
      }, {
        ...corsHeaders(),
        "Content-Type": "application/json; charset=utf-8",
      });
    } catch (err) {
      send(res, 500, { ok: false, error: err?.message || String(err) }, {
        ...corsHeaders(),
        "Content-Type": "application/json; charset=utf-8",
      });
    }
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/tts") {
    try {
      const body = await readJson(req);
      const result = await processTtsRequest({ method: "POST", body });
      const headers = { ...corsHeaders(), ...result.headers };
      if (result.status === 204) {
        send(res, 204, "", headers);
        return;
      }
      send(res, result.status, result.body, headers);
    } catch (err) {
      send(res, 500, { ok: false, error: err?.message || String(err) }, {
        ...corsHeaders(),
        "Content-Type": "application/json; charset=utf-8",
      });
    }
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/ollama/tags") {
    const payload = await getOllamaTagsPayload();
    send(res, 200, payload, {
      ...corsHeaders(),
      "Content-Type": "application/json; charset=utf-8",
    });
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/llm/status") {
    const payload = await getLlmStatusPayload();
    send(res, 200, payload, {
      ...corsHeaders(),
      "Content-Type": "application/json; charset=utf-8",
    });
    return;
  }

  const mobileApi =
    url.pathname === "/api/auth/guest" ||
    url.pathname === "/api/auth/apple" ||
    url.pathname === "/api/auth/session" ||
    url.pathname === "/api/user/save" ||
    url.pathname === "/api/user/settings" ||
    url.pathname === "/api/iap/products" ||
    url.pathname === "/api/iap/verify" ||
    url.pathname === "/api/iap/webhook";
  if (mobileApi) {
    try {
      process.env.AMOJI_IAP_DEV = process.env.AMOJI_IAP_DEV || "1";
      process.env.AMOJI_USER_STORE_FS = process.env.AMOJI_USER_STORE_FS || "1";
      const modPath = `../../api${url.pathname.replace(/^\/api/, "")}.mjs`;
      const mod = await import(modPath);
      const body = await readJson(req).catch(() => ({}));
      const fakeRes = {
        statusCode: 200,
        headers: {},
        setHeader(k, v) {
          this.headers[k] = v;
        },
        status(code) {
          this.statusCode = code;
          return this;
        },
        json(payload) {
          send(res, this.statusCode, payload, {
            ...corsHeaders(),
            ...this.headers,
            "Content-Type": "application/json; charset=utf-8",
          });
        },
        end() {
          send(res, this.statusCode, "", { ...corsHeaders(), ...this.headers });
        },
      };
      await mod.default({ ...req, body, method: req.method, headers: req.headers }, fakeRes);
    } catch (err) {
      send(res, 500, { ok: false, error: err?.message || String(err) }, {
        ...corsHeaders(),
        "Content-Type": "application/json; charset=utf-8",
      });
    }
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/health") {
    send(
      res,
      200,
      {
        ok: true,
        service: "amoji-companion",
        build: AMOJI_BUILD,
        time: new Date().toISOString(),
      },
      {
        ...corsHeaders(),
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    );
    return;
  }

  if (req.method !== "GET" && req.method !== "HEAD") {
    send(res, 405, "Method Not Allowed");
    return;
  }

  const servedPath = rewriteCompanionServePath(url.pathname);
  let target = safeJoin(REPO_ROOT, servedPath);
  if (!target) {
    send(res, 403, "Forbidden");
    return;
  }

  if (servedPath === "/" || url.pathname === "/") {
    target = path.join(REPO_ROOT, "prototypes/amoji-companion.html");
  } else if (url.pathname === "/app" || url.pathname === "/app/") {
    target = path.join(REPO_ROOT, "app/index.html");
  } else if (url.pathname === "/privacy" || url.pathname === "/privacy/") {
    target = path.join(REPO_ROOT, "privacy.html");
  }

  fs.stat(target, (err, st) => {
    if (err || !st.isFile()) {
      send(res, 404, `Not found: ${req.url}`);
      return;
    }
    const ext = path.extname(target).toLowerCase();
    const type = MIME[ext] || "application/octet-stream";
    const headers = {
      "Content-Type": type,
      "Cache-Control": "no-store",
    };
    if (ext === ".html") {
      Object.assign(headers, FRESH_HTML_HEADERS, { "Content-Type": type });
    }
    res.writeHead(200, headers);
    if (req.method === "HEAD") {
      res.end();
      return;
    }
    fs.createReadStream(target).pipe(res);
  });
});

server.listen(port, "0.0.0.0", () => {
  console.log(`[lab] serving ${REPO_ROOT}`);
  console.log(`[lab] companion http://127.0.0.1:${port}/`);
  console.log(`[lab] play     http://127.0.0.1:${port}/play`);
  console.log(`[lab] mobile   http://127.0.0.1:${port}/app`);
  console.log(`[lab] unique  http://127.0.0.1:${port}/c/${AMOJI_BUILD}/full`);
  console.log(`[lab] cloud deploy: see DEPLOY.md (Vercel — no local PC needed)`);
});
