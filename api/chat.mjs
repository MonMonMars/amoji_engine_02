import {
  corsHeaders,
  processChatRequest,
} from "../amoji-engine/engine/companion/chatApiHandler.mjs";
import { applyApiProtection } from "./_lib/security.mjs";

export default async function handler(req, res) {
  for (const [key, value] of Object.entries(corsHeaders())) {
    res.setHeader(key, value);
  }
  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }
  const guard = applyApiProtection(req, res, {
    rateLimit: { key: "chat-api", max: 45, windowMs: 60_000 },
  });
  if (!guard.ok) {
    res.status(guard.status || 429).json({ ok: false, error: guard.error });
    return;
  }
  if (req.method !== "POST") {
    res.status(405).json({ ok: false, error: "Method not allowed" });
    return;
  }
  try {
    const body =
      typeof req.body === "string"
        ? JSON.parse(req.body || "{}")
        : req.body || {};
    const result = await processChatRequest(body);
    const status =
      result.ok === false && result.error === "empty message" ? 400 : 200;
    res.status(status).json(result);
  } catch (err) {
    res.status(500).json({ ok: false, error: err?.message || String(err) });
  }
}
