import {
  createAppleSession,
  decodeAppleIdentityToken,
} from "../_lib/auth.mjs";
import { getUserRecord } from "../_lib/userStore.mjs";
import { applyCors, handleOptions, json, readJsonBody, requireMethod } from "../_lib/http.mjs";

export default async function handler(req, res) {
  if (handleOptions(req, res)) return;
  applyCors(res);
  if (!requireMethod(req, res, "POST")) return;

  try {
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
  } catch (err) {
    json(res, 500, { ok: false, error: err?.message || String(err) });
  }
}
