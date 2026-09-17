import { corsHeaders } from "../amoji-engine/engine/companion/chatApiHandler.mjs";
import {
  fetchWebContextForChat,
  needsWebSearch,
  searchWeb,
} from "../amoji-engine/engine/companion/companionWebSearch.mjs";

export default async function handler(req, res) {
  for (const [key, value] of Object.entries(corsHeaders())) {
    res.setHeader(key, value);
  }
  if (req.method === "OPTIONS") {
    res.status(204).end();
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
    const query = String(body.query || body.message || "").trim();
    if (!query) {
      res.status(400).json({ ok: false, error: "empty query" });
      return;
    }
    if (body.contextOnly) {
      const context = await fetchWebContextForChat(query, fetch);
      res.status(200).json({ ok: true, ...context, needs: needsWebSearch(query) });
      return;
    }
    const result = await searchWeb(query, fetch);
    res.status(200).json({
      ok: result.ok,
      summary: result.summary,
      source: result.source,
      needs: needsWebSearch(query),
    });
  } catch (err) {
    res.status(500).json({ ok: false, error: err?.message || String(err) });
  }
}
