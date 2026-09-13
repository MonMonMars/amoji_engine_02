#!/usr/bin/env node
/**
 * Static file server for Amoji demos + optional LLM chat proxy.
 * Serves the repository root so `../amoji-engine/engine/` imports resolve.
 *
 * Usage (from amoji-engine/):
 *   npm run lab
 *   npm run lab -- --port 5173
 *
 * Local LLM via Ollama (default — start Ollama on your machine first):
 *   ollama serve
 *   ollama pull llama3.2
 *   npm run lab
 *
 * Optional cloud LLM (OpenAI-compatible):
 *   OPENAI_API_KEY=sk-… npm run lab
 *
 * Custom Ollama host (e.g. if not on 11434):
 *   OLLAMA_HOST=http://127.0.0.1:11434 npm run lab
 */
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { CANTONESE_COMPANION_PROMPT } from "../engine/companion/companionBodyMotion.js";
import {
  chatOllama,
  isOllamaReachable,
  listOllamaModels,
  pickOllamaModel,
  OLLAMA_DEFAULT_HOST,
} from "../engine/companion/companionOllama.js";

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
  if (nameMatch) {
    return `你好呀${nameMatch[1]}！好開心認識你～今日想傾啲咩？ [mood:happy]`;
  }
  if (/哈哈|開心|happy|great|鍾意/.test(lower)) {
    return "哈哈我都開心到跳起！再講多啲啦～ [mood:happy]";
  }
  if (/唉|傷心|sad|慘|唔開心/.test(lower)) {
    return "抱抱你呀…慢慢講，我喺度聽住。 [mood:sad]";
  }
  if (/點解|why|諗|hmm/.test(lower)) {
    return "嗯…等我諗一諗先。你覺得邊方面最關鍵？ [mood:thinking]";
  }
  if (/hello|hi|hey|你好|早晨|晚安/.test(lower)) {
    return "嗨呀～我係 Amoji！同我傾偈啦，我會用粵語答你㗎。 [mood:happy]";
  }
  if (/你係邊個|who are you|你叫咩/.test(lower)) {
    return "我係 Amoji 呀，你嘅動漫夥伴，會做表情同手勢㗎！ [mood:happy]";
  }
  if (/哇|嘩|唔信|真係/.test(text)) {
    return "嘩！真係呀？講多啲俾我聽啦！ [mood:surprised]";
  }
  if (lastUser?.content && /再见|拜拜|bye/.test(lower)) {
    return "拜拜啦～記得返嚟搵我呀！ [mood:happy]";
  }
  const snippets = [
    `「${text.slice(0, 24)}」——我聽到啦，再講深啲？ [mood:thinking]`,
    "有意思喎！我覺得幾好玩呀～ [mood:happy]",
    "嗯嗯，繼續講，我跟住你情緒走。 [mood:neutral]",
  ];
  return snippets[Math.floor(Math.random() * snippets.length)];
}

async function handleChatApi(req, res) {
  cors(res);
  try {
    const body = await readJson(req);
    const message = String(body.message || body.text || "").trim();
    const history = Array.isArray(body.history) ? body.history : [];
    const system = body.system || CANTONESE_COMPANION_PROMPT;

    if (!message) {
      send(res, 400, { ok: false, error: "empty message" }, {
        "Content-Type": "application/json; charset=utf-8",
      });
      return;
    }

    const ollamaHost =
      process.env.OLLAMA_HOST ||
      process.env.OLLAMA_BASE_URL ||
      OLLAMA_DEFAULT_HOST;
    const ollamaUp = await isOllamaReachable(ollamaHost);
    const apiKeyProbe =
      process.env.OPENAI_API_KEY ||
      process.env.AMOJI_LLM_KEY ||
      process.env.GROQ_API_KEY ||
      "";

    if (message === "__ping__") {
      let mode = "local";
      let model =
        body.model ||
        process.env.OLLAMA_MODEL ||
        process.env.AMOJI_LLM_MODEL ||
        "llama3.2";
      if (ollamaUp) {
        mode = "ollama";
        const models = await listOllamaModels(ollamaHost);
        model = pickOllamaModel(models, model);
      } else if (apiKeyProbe) {
        mode = "online";
        model =
          process.env.OPENAI_MODEL ||
          (process.env.GROQ_API_KEY ? "llama-3.3-70b-versatile" : "gpt-4o");
      }
      send(
        res,
        200,
        { ok: true, mode, model, ollama: ollamaUp, host: ollamaHost },
        { "Content-Type": "application/json; charset=utf-8" },
      );
      return;
    }

    const messages = [
      { role: "system", content: system },
      ...history.slice(-12),
    ];
    const last = messages[messages.length - 1];
    if (!last || last.role !== "user" || last.content !== message) {
      messages.push({ role: "user", content: message });
    }

    if (ollamaUp && process.env.OLLAMA_DISABLED !== "1") {
      const ollama = await chatOllama({
        base: ollamaHost,
        model:
          body.model ||
          process.env.OLLAMA_MODEL ||
          process.env.AMOJI_LLM_MODEL,
        messages,
        fetchImpl: fetch,
      });
      if (ollama.ok) {
        send(
          res,
          200,
          {
            ok: true,
            reply: ollama.reply,
            mode: "ollama",
            model: ollama.model,
          },
          { "Content-Type": "application/json; charset=utf-8" },
        );
        return;
      }
      console.warn("[lab] Ollama failed", ollama.error);
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
      body.model ||
      process.env.AMOJI_LLM_MODEL ||
      process.env.OPENAI_MODEL ||
      (process.env.GROQ_API_KEY ? "llama-3.3-70b-versatile" : "gpt-4o");

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
          temperature: 0.75,
          messages: messages.filter((m, i, arr) => {
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

  if (req.method === "GET" && url.pathname === "/api/ollama/tags") {
    cors(res);
    const host =
      process.env.OLLAMA_HOST ||
      process.env.OLLAMA_BASE_URL ||
      OLLAMA_DEFAULT_HOST;
    const models = await listOllamaModels(host);
    send(
      res,
      200,
      { ok: true, models, host, reachable: models.length > 0 },
      { "Content-Type": "application/json; charset=utf-8" },
    );
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
  console.log(`[lab] chat API POST /api/chat (Ollama @ ${OLLAMA_DEFAULT_HOST} or OPENAI_API_KEY)`);
});
