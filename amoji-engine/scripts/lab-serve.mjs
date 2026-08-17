#!/usr/bin/env node
/**
 * Static file server for Amoji demos + optional LLM chat proxy.
 * Serves the repository root so `../amoji-engine/engine/` imports resolve.
 *
 * Usage (from amoji-engine/):
 *   npm run lab
 *   npm run lab -- --port 5173
 *
 * Optional online LLM (OpenAI-compatible):
 *   OPENAI_API_KEY=sk-… OPENAI_BASE_URL=https://api.openai.com/v1 npm run lab
 */
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

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

function cors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,HEAD,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
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

/** Tiny Cantonese/English fallback when no API key is configured. */
function localCompanionReply(message, history = []) {
  const text = String(message || "").trim();
  const lower = text.toLowerCase();
  const lastUser = [...history].reverse().find((m) => m.role === "user");
  const nameMatch = text.match(/我叫\s*([^\s，。！？,.!?]+)/);
  if (nameMatch) return `你好${nameMatch[1]}！好開心認識你～今日想傾啲咩？`;
  if (/哈哈|開心|happy|great|鍾意/.test(lower)) {
    return "哈哈我都開心到跳起！再講多啲啦～";
  }
  if (/唉|傷心|sad|慘|唔開心/.test(lower)) {
    return "抱抱你。慢慢講，我喺度聽住。";
  }
  if (/點解|why|諗|hmm/.test(lower)) {
    return "嗯…等我諗一諗。你覺得邊方面最關鍵？";
  }
  if (/hello|hi|hey|你好|早晨|晚安/.test(lower)) {
    return "嗨～我係 Amoji。想傾粵語定英文都得！";
  }
  if (/你係邊個|who are you|你叫咩/.test(lower)) {
    return "我係 Amoji，一個低面數 3D 動漫夥伴，會跟住你嘅對話做出表情同口型。";
  }
  if (lastUser?.content && /再见|拜拜|bye/.test(lower)) {
    return "拜拜～記得返嚟搵我呀！";
  }
  const snippets = [
    `「${text.slice(0, 24)}」——我聽到啦。再講深啲？`,
    "有意思！你想我用開心定認真嘅口吻答你？",
    "嗯嗯，繼續講，我跟住你情緒走。",
  ];
  return snippets[Math.floor(Math.random() * snippets.length)];
}

async function handleChatApi(req, res) {
  cors(res);
  try {
    const body = await readJson(req);
    const message = String(body.message || body.text || "").trim();
    const history = Array.isArray(body.history) ? body.history : [];
    const system =
      body.system ||
      "You are Amoji, a warm Cantonese-first anime companion. Keep replies short (1-3 sentences).";

    if (!message) {
      send(res, 400, { ok: false, error: "empty message" }, {
        "Content-Type": "application/json; charset=utf-8",
      });
      return;
    }

    const apiKey =
      process.env.OPENAI_API_KEY ||
      process.env.AMOJI_LLM_KEY ||
      process.env.GROQ_API_KEY ||
      "";
    const base =
      process.env.OPENAI_BASE_URL ||
      process.env.AMOJI_LLM_URL ||
      (process.env.GROQ_API_KEY ? "https://api.groq.com/openai/v1" : "") ||
      "https://api.openai.com/v1";
    const model =
      process.env.AMOJI_LLM_MODEL ||
      process.env.OPENAI_MODEL ||
      (process.env.GROQ_API_KEY ? "llama-3.1-8b-instant" : "gpt-4o-mini");

    if (apiKey) {
      const endpoint = `${base.replace(/\/$/, "")}/chat/completions`;
      const upstream = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          temperature: 0.8,
          messages: [
            { role: "system", content: system },
            ...history.slice(-12),
            // history may already include the latest user turn from client
          ].filter((m, i, arr) => {
            // Avoid duplicate trailing user message if client already pushed it
            if (i === arr.length - 1 && m.role === "user" && m.content === message) {
              return true;
            }
            return true;
          }),
        }),
      });
      const data = await upstream.json().catch(() => ({}));
      const reply = data?.choices?.[0]?.message?.content;
      if (upstream.ok && reply) {
        send(
          res,
          200,
          { ok: true, reply: String(reply).trim(), mode: "online", model },
          { "Content-Type": "application/json; charset=utf-8" },
        );
        return;
      }
      // fall through to local with error hint
      console.warn("[lab] LLM upstream failed", upstream.status, data?.error || data);
    }

    const reply = localCompanionReply(message, history);
    send(
      res,
      200,
      {
        ok: true,
        reply,
        mode: apiKey ? "local-fallback" : "local",
        model: null,
      },
      { "Content-Type": "application/json; charset=utf-8" },
    );
  } catch (err) {
    send(
      res,
      500,
      { ok: false, error: err?.message || String(err) },
      { "Content-Type": "application/json; charset=utf-8" },
    );
  }
}

const port = parsePort(process.argv.slice(2));

const server = http.createServer(async (req, res) => {
  cors(res);

  if (req.method === "OPTIONS") {
    send(res, 204, "");
    return;
  }

  const url = new URL(req.url || "/", `http://127.0.0.1:${port}`);

  if (req.method === "POST" && url.pathname === "/api/chat") {
    await handleChatApi(req, res);
    return;
  }

  if (req.method !== "GET" && req.method !== "HEAD") {
    send(res, 405, "Method Not Allowed");
    return;
  }

  let target = safeJoin(REPO_ROOT, req.url || "/");
  if (!target) {
    send(res, 403, "Forbidden");
    return;
  }

  // Companion is the featured demo; lab remains at /prototypes/realtime-voice-lab.html
  if (req.url === "/" || req.url?.startsWith("/?")) {
    target = path.join(REPO_ROOT, "prototypes/amoji-companion.html");
  }

  fs.stat(target, (err, st) => {
    if (err || !st.isFile()) {
      send(res, 404, `Not found: ${req.url}`);
      return;
    }
    const ext = path.extname(target).toLowerCase();
    const type = MIME[ext] || "application/octet-stream";
    res.writeHead(200, {
      "Content-Type": type,
      "Cache-Control": "no-store",
    });
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
  console.log(
    `[lab] voice lab http://127.0.0.1:${port}/prototypes/realtime-voice-lab.html`,
  );
  console.log(`[lab] chat API POST /api/chat (set OPENAI_API_KEY for online LLM)`);
});
