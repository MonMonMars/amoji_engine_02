import {
  corsHeaders,
  getLlmStatusPayload,
  getOllamaTagsPayload,
} from "../../amoji-engine/engine/companion/chatApiHandler.mjs";

async function handleStatus(_req, res) {
  const payload = await getLlmStatusPayload();
  res.status(200).json(payload);
}

async function handleOllamaTags(_req, res) {
  const payload = await getOllamaTagsPayload();
  res.status(200).json(payload);
}

/** @type {Record<string, (req: import("http").IncomingMessage, res: import("http").ServerResponse) => Promise<void>>} */
const ROUTES = {
  status: handleStatus,
  "ollama-tags": handleOllamaTags,
};

export default async function handler(req, res) {
  for (const [key, value] of Object.entries(corsHeaders())) {
    res.setHeader(key, value);
  }
  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }
  if (req.method !== "GET") {
    res.status(405).json({ ok: false, error: "Method not allowed" });
    return;
  }

  const action = String(req.query?.action || "").toLowerCase();
  const route = ROUTES[action];
  if (!route) {
    res.status(404).json({ ok: false, error: "Unknown LLM action" });
    return;
  }

  try {
    await route(req, res);
  } catch (err) {
    res.status(500).json({ ok: false, error: err?.message || String(err) });
  }
}
