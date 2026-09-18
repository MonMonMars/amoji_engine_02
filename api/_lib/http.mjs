import { corsHeaders } from "../../amoji-engine/engine/companion/chatApiHandler.mjs";

/**
 * Apply CORS + optional extra headers on Vercel/Node response objects.
 * @param {import("http").ServerResponse} res
 * @param {Record<string, string>} [extra]
 */
export function applyCors(res, extra = {}) {
  for (const [key, value] of Object.entries(corsHeaders(extra))) {
    res.setHeader(key, value);
  }
}

/**
 * @param {import("http").IncomingMessage & { body?: unknown }} req
 */
export function readJsonBody(req) {
  if (req.body && typeof req.body === "object") return req.body;
  if (typeof req.body === "string") {
    try {
      return JSON.parse(req.body || "{}");
    } catch {
      return {};
    }
  }
  return {};
}

/**
 * @param {import("http").ServerResponse} res
 * @param {number} status
 * @param {unknown} payload
 */
export function json(res, status, payload) {
  res.status(status).json(payload);
}

/**
 * @param {import("http").IncomingMessage} req
 * @param {import("http").ServerResponse} res
 * @returns {boolean}
 */
export function handleOptions(req, res) {
  applyCors(res);
  if (req.method === "OPTIONS") {
    res.status(204).end();
    return true;
  }
  return false;
}

/**
 * @param {import("http").IncomingMessage} req
 * @param {import("http").ServerResponse} res
 * @param {string|string[]} allowed
 * @returns {boolean}
 */
export function requireMethod(req, res, allowed) {
  const methods = Array.isArray(allowed) ? allowed : [allowed];
  if (methods.includes(req.method || "")) return true;
  json(res, 405, { ok: false, error: "Method not allowed" });
  return false;
}

/**
 * @param {import("http").IncomingMessage} req
 */
export function bearerToken(req) {
  const header = req.headers?.authorization || req.headers?.Authorization || "";
  const match = String(header).match(/^Bearer\s+(.+)$/i);
  return match ? match[1].trim() : "";
}
