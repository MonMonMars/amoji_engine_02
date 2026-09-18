import { verifySession } from "../_lib/auth.mjs";
import {
  getUserRecord,
  mergeSave,
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

async function requireUser(req, res) {
  const token = bearerToken(req);
  const payload = verifySession(token);
  if (!payload) {
    json(res, 401, { ok: false, error: "Unauthorized" });
    return null;
  }
  return payload;
}

async function handleSave(req, res) {
  const payload = await requireUser(req, res);
  if (!payload) return;

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
}

async function handleSettings(req, res) {
  const payload = await requireUser(req, res);
  if (!payload) return;

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
}

/** @type {Record<string, (req: import("http").IncomingMessage, res: import("http").ServerResponse) => Promise<void>>} */
const ROUTES = {
  save: handleSave,
  settings: handleSettings,
};

export default async function handler(req, res) {
  if (handleOptions(req, res)) return;
  applyCors(res);

  const action = String(req.query?.action || "").toLowerCase();
  const route = ROUTES[action];
  if (!route) {
    json(res, 404, { ok: false, error: "Unknown user action" });
    return;
  }

  try {
    await route(req, res);
  } catch (err) {
    json(res, 500, { ok: false, error: err?.message || String(err) });
  }
}
