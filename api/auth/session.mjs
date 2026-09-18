import { verifySession } from "../_lib/auth.mjs";
import { getUserRecord } from "../_lib/userStore.mjs";
import {
  applyCors,
  bearerToken,
  handleOptions,
  json,
  requireMethod,
} from "../_lib/http.mjs";

export default async function handler(req, res) {
  if (handleOptions(req, res)) return;
  applyCors(res);
  if (!requireMethod(req, res, "GET")) return;

  try {
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
  } catch (err) {
    json(res, 500, { ok: false, error: err?.message || String(err) });
  }
}
