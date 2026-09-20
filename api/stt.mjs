import { processSttRequest } from "../amoji-engine/engine/companion/sttHandler.mjs";
import { applyApiProtection } from "./_lib/security.mjs";

export default async function handler(req, res) {
  const guard = applyApiProtection(req, res, {
    rateLimit: { key: "stt-api", max: 40, windowMs: 60_000 },
  });
  if (!guard.ok) {
    res.status(guard.status || 429).json({ ok: false, error: guard.error });
    return;
  }
  const result = await processSttRequest({
    method: req.method,
    body:
      typeof req.body === "string"
        ? req.body
        : req.body || {},
  });

  for (const [key, value] of Object.entries(result.headers || {})) {
    res.setHeader(key, value);
  }

  if (result.status === 204) {
    res.status(204).end();
    return;
  }

  res.status(result.status).json(result.body);
}
