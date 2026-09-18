import crypto from "node:crypto";

export const AUTH_SCHEMA = "amoji.auth.v1";
export const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 30;

/**
 * @returns {string}
 */
export function authSecret() {
  return (
    process.env.AMOJI_AUTH_SECRET ||
    process.env.JWT_SECRET ||
    (process.env.NODE_ENV === "production" ? "" : "amoji-dev-auth-secret-change-me")
  );
}

/**
 * @param {Record<string, unknown>} payload
 * @param {number} [ttlMs]
 */
export function signSession(payload, ttlMs = SESSION_TTL_MS) {
  const secret = authSecret();
  if (!secret) {
    throw new Error("AMOJI_AUTH_SECRET is required in production");
  }
  const now = Date.now();
  const body = {
    schema: AUTH_SCHEMA,
    iat: now,
    exp: now + ttlMs,
    ...payload,
  };
  const encoded = Buffer.from(JSON.stringify(body)).toString("base64url");
  const sig = crypto.createHmac("sha256", secret).update(encoded).digest("base64url");
  return `${encoded}.${sig}`;
}

/**
 * @param {string} token
 */
export function verifySession(token) {
  const secret = authSecret();
  if (!secret || !token || typeof token !== "string") return null;
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [encoded, sig] = parts;
  const expected = crypto.createHmac("sha256", secret).update(encoded).digest("base64url");
  if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  try {
    const payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8"));
    if (!payload || payload.schema !== AUTH_SCHEMA) return null;
    if (typeof payload.exp === "number" && Date.now() > payload.exp) return null;
    if (!payload.sub || typeof payload.sub !== "string") return null;
    return payload;
  } catch {
    return null;
  }
}

/**
 * @param {string} [prefix]
 */
export function createUserId(prefix = "usr") {
  return `${prefix}_${crypto.randomBytes(12).toString("hex")}`;
}

/**
 * @param {string} token
 */
export function createGuestSession(token) {
  const userId = createUserId("guest");
  return {
    userId,
    token: signSession({
      sub: userId,
      provider: "guest",
      displayName: "Guest",
      guestToken: token || crypto.randomBytes(8).toString("hex"),
    }),
  };
}

/**
 * Minimal Apple identity token decode (production should verify JWK signature).
 * @param {string} identityToken
 */
export function decodeAppleIdentityToken(identityToken) {
  if (!identityToken || typeof identityToken !== "string") return null;
  const parts = identityToken.split(".");
  if (parts.length < 2) return null;
  try {
    const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8"));
    if (!payload?.sub) return null;
    return {
      appleSub: String(payload.sub),
      email: typeof payload.email === "string" ? payload.email : "",
      emailVerified:
        payload.email_verified === true || payload.email_verified === "true",
    };
  } catch {
    return null;
  }
}

/**
 * @param {{
 *   appleSub: string,
 *   email?: string,
 *   displayName?: string,
 * }} info
 */
export function createAppleSession(info) {
  const userId = `apple_${crypto.createHash("sha256").update(info.appleSub).digest("hex").slice(0, 24)}`;
  return {
    userId,
    token: signSession({
      sub: userId,
      provider: "apple",
      appleSub: info.appleSub,
      email: info.email || "",
      displayName: info.displayName || "Apple Player",
    }),
  };
}
