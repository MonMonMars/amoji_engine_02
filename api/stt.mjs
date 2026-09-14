import { processSttRequest } from "../amoji-engine/engine/companion/sttHandler.mjs";

export default async function handler(req, res) {
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
