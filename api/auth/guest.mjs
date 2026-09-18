import { createGuestSession } from "../_lib/auth.mjs";
import { getUserRecord } from "../_lib/userStore.mjs";
import { applyCors, handleOptions, json, readJsonBody, requireMethod } from "../_lib/http.mjs";

export default async function handler(req, res) {
  if (handleOptions(req, res)) return;
  applyCors(res);
  if (!requireMethod(req, res, "POST")) return;

  try {
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
  } catch (err) {
    json(res, 500, { ok: false, error: err?.message || String(err) });
  }
}
