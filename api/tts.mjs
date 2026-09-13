import { processTtsRequest } from "../amoji-engine/engine/companion/ttsHandler.mjs";

export default async function handler(req, res) {
  const result = await processTtsRequest({
    method: req.method,
    body: req.body,
  });

  for (const [key, value] of Object.entries(result.headers)) {
    res.setHeader(key, value);
  }

  if (result.status === 204) {
    res.status(204).end();
    return;
  }

  if (Buffer.isBuffer(result.body)) {
    res.status(result.status).send(result.body);
    return;
  }

  res.status(result.status).json(result.body);
}
