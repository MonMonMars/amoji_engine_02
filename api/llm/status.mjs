import {
  corsHeaders,
  getLlmStatusPayload,
} from "../../amoji-engine/engine/companion/chatApiHandler.mjs";

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
  try {
    const payload = await getLlmStatusPayload();
    res.status(200).json(payload);
  } catch (err) {
    res.status(500).json({ ok: false, error: err?.message || String(err) });
  }
}
