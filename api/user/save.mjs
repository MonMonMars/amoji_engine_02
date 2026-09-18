import { verifySession } from "../_lib/auth.mjs";
import {
  getUserRecord,
  mergeSave,
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
      json(res, 200, {
        ok: true,
        userId: payload.sub,
        save: record.save,
        entitlements: record.entitlements,
        updatedAt: record.updatedAt,
      });
      return;
    }

    if (!requireMethod(req, res, "POST")) return;
    const body = readJsonBody(req);
    const record = await getUserRecord(payload.sub);
    const merged = mergeSave(record.save, body?.save || body);
    const next = await patchUserRecord(payload.sub, { save: merged });
    json(res, 200, {
      ok: true,
      userId: payload.sub,
      save: next.save,
      updatedAt: next.updatedAt,
    });
  } catch (err) {
    json(res, 500, { ok: false, error: err?.message || String(err) });
  }
}
