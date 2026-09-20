import crypto from "node:crypto";

export const SECURITY_SCHEMA = "amoji.security.v1";

const rateBuckets = globalThis.__amojiRateBuckets || new Map();
globalThis.__amojiRateBuckets = rateBuckets;

const receiptLedger = globalThis.__amojiReceiptLedger || new Map();
globalThis.__amojiReceiptLedger = receiptLedger;

/**
 * @returns {Record<string, string>}
 */
export function securityHeaders() {
  return {
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Permissions-Policy": "camera=(), microphone=(self), geolocation=()",
    "X-Amoji-Security": SECURITY_SCHEMA,
  };
}

/**
 * @returns {string[]}
 */
export function allowedOrigins() {
  const raw = process.env.AMOJI_ALLOWED_ORIGINS || "";
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * @param {import("http").IncomingMessage} req
 */
export function requestOrigin(req) {
  const origin = req.headers?.origin || req.headers?.Origin;
  if (origin && typeof origin === "string") return origin;
  const referer = req.headers?.referer || req.headers?.Referer;
  if (referer && typeof referer === "string") {
    try {
      return new URL(referer).origin;
    } catch {
      return "";
    }
  }
  return "";
}

/**
 * When AMOJI_ALLOWED_ORIGINS is set, block cross-site API abuse from unknown sites.
 * @param {import("http").IncomingMessage} req
 */
export function assertAllowedOrigin(req) {
  const list = allowedOrigins();
  if (!list.length) return true;
  const origin = requestOrigin(req);
  if (!origin) return true;
  return list.some((allowed) => origin === allowed || origin.endsWith(allowed));
}

/**
 * @param {import("http").IncomingMessage} req
 */
export function clientIp(req) {
  const forwarded = req.headers?.["x-forwarded-for"] || req.headers?.["X-Forwarded-For"];
  if (typeof forwarded === "string" && forwarded.trim()) {
    return forwarded.split(",")[0].trim();
  }
  return req.socket?.remoteAddress || "unknown";
}

/**
 * @param {import("http").IncomingMessage} req
 * @param {string} bucket
 * @param {{ max?: number, windowMs?: number }} [opts]
 */
export function checkRateLimit(req, bucket, opts = {}) {
  const max = opts.max ?? 60;
  const windowMs = opts.windowMs ?? 60_000;
  const ip = clientIp(req);
  const key = `${bucket}:${ip}`;
  const now = Date.now();
  let entry = rateBuckets.get(key);
  if (!entry || now - entry.start > windowMs) {
    entry = { start: now, count: 0 };
  }
  entry.count += 1;
  rateBuckets.set(key, entry);
  if (entry.count > max) {
    return {
      ok: false,
      retryAfterMs: Math.max(0, windowMs - (now - entry.start)),
    };
  }
  return { ok: true, retryAfterMs: 0 };
}

/**
 * @param {string} receipt
 * @param {string} productId
 * @param {string} userId
 */
export function receiptFingerprint(receipt, productId, userId) {
  const raw = `${productId}|${userId}|${String(receipt).trim()}`;
  return crypto.createHash("sha256").update(raw).digest("hex");
}

/**
 * @param {string} fingerprint
 * @param {string} userId
 */
export function isReceiptReplay(fingerprint, userId) {
  const existing = receiptLedger.get(fingerprint);
  if (!existing) return false;
  return existing.userId !== userId;
}

/**
 * @param {string} fingerprint
 * @param {string} userId
 */
export function isReceiptAlreadyFulfilled(fingerprint, userId) {
  const existing = receiptLedger.get(fingerprint);
  return Boolean(existing && existing.userId === userId);
}

/**
 * @param {string} fingerprint
 * @param {string} userId
 */
export function markReceiptUsed(fingerprint, userId) {
  receiptLedger.set(fingerprint, { userId, at: new Date().toISOString() });
}

/**
 * @param {string} receipt
 */
export function isDevReceipt(receipt) {
  return String(receipt || "").startsWith("dev_");
}

/**
 * Production must not accept dev_* receipts unless AMOJI_IAP_DEV=1.
 * @param {string} receipt
 */
export function assertPurchaseReceiptAllowed(receipt) {
  if (process.env.AMOJI_IAP_DEV === "1") return { ok: true };
  if (!receipt || !String(receipt).trim()) {
    return { ok: false, error: "Missing purchase receipt" };
  }
  if (isDevReceipt(receipt)) {
    return { ok: false, error: "Dev purchases disabled in production" };
  }
  return { ok: true };
}

/**
 * @param {string} type
 * @param {Record<string, unknown>} meta
 */
export function auditSecurityEvent(type, meta = {}) {
  if (process.env.AMOJI_SECURITY_AUDIT !== "1") return;
  const line = JSON.stringify({
    schema: SECURITY_SCHEMA,
    type,
    at: new Date().toISOString(),
    ...meta,
  });
  console.info("[amoji-security]", line);
}

/**
 * Warn when production is missing critical secrets (does not throw — Vercel cold start friendly).
 */
export function validateProductionSecrets() {
  if (process.env.NODE_ENV !== "production" && process.env.VERCEL !== "1") return [];
  const warnings = [];
  if (!process.env.AMOJI_AUTH_SECRET && !process.env.JWT_SECRET) {
    warnings.push("AMOJI_AUTH_SECRET");
  }
  if (process.env.AMOJI_IAP_DEV === "1") {
    warnings.push("AMOJI_IAP_DEV should be 0 in production");
  }
  if (!process.env.REVENUECAT_WEBHOOK_SECRET && process.env.REVENUECAT_PUBLIC_API_KEY) {
    warnings.push("REVENUECAT_WEBHOOK_SECRET");
  }
  return warnings;
}

/**
 * @param {import("http").IncomingMessage} req
 * @param {import("http").ServerResponse} res
 * @param {{
 *   rateLimit?: { key: string, max?: number, windowMs?: number },
 *   requireOrigin?: boolean,
 * }} [opts]
 */
export function applyApiProtection(req, res, opts = {}) {
  for (const [key, value] of Object.entries(securityHeaders())) {
    res.setHeader(key, value);
  }
  if (opts.requireOrigin && allowedOrigins().length && !assertAllowedOrigin(req)) {
    auditSecurityEvent("origin_blocked", { origin: requestOrigin(req) });
    return { ok: false, status: 403, error: "Origin not allowed" };
  }
  if (opts.rateLimit) {
    const rl = checkRateLimit(req, opts.rateLimit.key, opts.rateLimit);
    if (!rl.ok) {
      auditSecurityEvent("rate_limited", { bucket: opts.rateLimit.key, ip: clientIp(req) });
      res.setHeader("Retry-After", String(Math.ceil(rl.retryAfterMs / 1000)));
      return { ok: false, status: 429, error: "Too many requests", retryAfterMs: rl.retryAfterMs };
    }
  }
  return { ok: true };
}
