import { createGuestSession, createAppleSession, decodeAppleIdentityToken, verifySession } from "../_lib/auth.mjs";
import { getUserRecord } from "../_lib/userStore.mjs";
import {
  applyCors,
  bearerToken,
  handleOptions,
  json,
  readJsonBody,
  requireMethod,
} from "../_lib/http.mjs";
import { applyApiProtection } from "../_lib/security.mjs";

async function handleGuest(req, res) {
  if (!requireMethod(req, res, "POST")) return;
  const guard = applyApiProtection(req, res, {
    rateLimit: { key: "auth-guest", max: 30, windowMs: 60_000 },
  });
  if (!guard.ok) {
    json(res, guard.status || 429, { ok: false, error: guard.error });
    return;
  }
  const body = readJsonBody(req);
  const session = createGuestSession(body?.deviceId || body?.guestToken || "");
  await getUserRecord(session.userId);
  json(res, 200, {
    ok: true,
    provider: "guest",
    userId: session.userId,
    token: session.token,
    expiresInDays: 30,
  });
}

async function handleApple(req, res) {
  if (!requireMethod(req, res, "POST")) return;
  const body = readJsonBody(req);
  const identityToken = body?.identityToken || body?.idToken || "";
  const decoded = decodeAppleIdentityToken(identityToken);
  if (!decoded) {
    json(res, 400, { ok: false, error: "Invalid Apple identity token" });
    return;
  }

  const strict =
    process.env.AMOJI_APPLE_STRICT === "1" || process.env.NODE_ENV === "production";
  if (strict && !process.env.APPLE_CLIENT_ID) {
    json(res, 503, {
      ok: false,
      error: "Apple Sign In not configured (set APPLE_CLIENT_ID + verify JWK in production)",
    });
    return;
  }

  const session = createAppleSession({
    appleSub: decoded.appleSub,
    email: body?.email || decoded.email,
    displayName: body?.displayName || body?.fullName || "Apple Player",
  });
  await getUserRecord(session.userId);
  json(res, 200, {
    ok: true,
    provider: "apple",
    userId: session.userId,
    token: session.token,
    email: decoded.email || "",
    expiresInDays: 30,
    note: strict
      ? "Production should verify Apple JWK signature before trusting identityToken."
      : "Dev mode: token payload decoded without JWK verification.",
  });
}

async function handleSession(req, res) {
  if (!requireMethod(req, res, "GET")) return;
  const token = bearerToken(req);
  const payload = verifySession(token);
  if (!payload) {
    json(res, 401, { ok: false, error: "Invalid or expired session" });
    return;
  }
  const record = await getUserRecord(payload.sub);
  json(res, 200, {
    ok: true,
    userId: payload.sub,
    provider: payload.provider || "unknown",
    displayName: payload.displayName || "Player",
    email: payload.email || "",
    entitlements: record.entitlements,
    settings: record.settings,
    updatedAt: record.updatedAt,
  });
}

/** @type {Record<string, (req: import("http").IncomingMessage, res: import("http").ServerResponse) => Promise<void>>} */
const ROUTES = {
  guest: handleGuest,
  apple: handleApple,
  session: handleSession,
};

export default async function handler(req, res) {
  if (handleOptions(req, res)) return;
  applyCors(res);

  const action = String(req.query?.action || "").toLowerCase();
  const route = ROUTES[action];
  if (!route) {
    json(res, 404, { ok: false, error: "Unknown auth action" });
    return;
  }

  try {
    await route(req, res);
  } catch (err) {
    json(res, 500, { ok: false, error: err?.message || String(err) });
  }
}
