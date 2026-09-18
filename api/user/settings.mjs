import { verifySession } from "../_lib/auth.mjs";
import {
  getUserRecord,
  mergeSettings,
  patchUserRecord,
} from "../_lib/userStore.mjs";
import {
  applyCors,
  bearerToken,
  handleOptions,
  json,
  readJsonBody,
  requireMethod,
} from "../_lib/http.mjs";

export default async function handler(req, res) {
  if (handleOptions(req, res)) return;
  applyCors(res);

  const token = bearerToken(req);
  const payload = verifySession(token);
  if (!payload) {
    json(res, 401, { ok: false, error: "Unauthorized" });
    return;
  }

  try {
    if (req.method === "GET") {
      const record = await getUserRecord(payload.sub);
      json(res, 200, { ok: true, settings: record.settings });
      return;
    }

    if (!requireMethod(req, res, ["POST", "PUT"])) return;
    const body = readJsonBody(req);
    const record = await getUserRecord(payload.sub);
    const merged = mergeSettings(record.settings, body?.settings || body);
    const next = await patchUserRecord(payload.sub, { settings: merged });
    json(res, 200, { ok: true, settings: next.settings, updatedAt: next.updatedAt });
  } catch (err) {
    json(res, 500, { ok: false, error: err?.message || String(err) });
  }
}
