import crypto from "node:crypto";
import { authSecret } from "./auth.mjs";
import { normalizeAdminRole } from "./adminRoles.mjs";

export const ADMIN_SESSION_SCHEMA = "amoji.adminSession.v1";
export const ADMIN_SESSION_TTL_MS = 1000 * 60 * 60 * 8;

/**
 * @typedef {{ id: string, email: string, role: string, passwordSha256?: string, disabled?: boolean }} AdminAccount
 */

/**
 * @param {string} password
 */
export function hashAdminPassword(password) {
  const salt = process.env.AMOJI_ADMIN_PASSWORD_SALT || authSecret() || "amoji-admin-salt";
  return crypto.createHash("sha256").update(`${salt}:${String(password)}`).digest("hex");
}

/**
 * @returns {AdminAccount[]}
 */
export function loadAdminAccounts() {
  const raw = process.env.AMOJI_ADMIN_ACCOUNTS;
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed
          .map((row) => ({
            id: String(row.id || row.email || "").trim(),
            email: String(row.email || "").trim().toLowerCase(),
            role: normalizeAdminRole(row.role),
            passwordSha256: row.passwordSha256
              ? String(row.passwordSha256).toLowerCase()
              : row.password
                ? hashAdminPassword(String(row.password))
                : "",
            disabled: Boolean(row.disabled),
          }))
          .filter((a) => a.id && a.email && a.passwordSha256);
      }
    } catch {
      /* fall through */
    }
  }

  const email = String(process.env.AMOJI_ADMIN_EMAIL || "").trim().toLowerCase();
  const password = process.env.AMOJI_ADMIN_PASSWORD || "";
  const role = normalizeAdminRole(process.env.AMOJI_ADMIN_ROLE || "superadmin");
  if (!email || !password) return [];
  return [
    {
      id: `admin_${crypto.createHash("sha256").update(email).digest("hex").slice(0, 12)}`,
      email,
      role,
      passwordSha256: hashAdminPassword(password),
      disabled: false,
    },
  ];
}

/**
 * @param {string} email
 * @param {string} password
 * @returns {AdminAccount | null}
 */
export function verifyAdminCredentials(email, password) {
  const normalized = String(email || "").trim().toLowerCase();
  const hash = hashAdminPassword(String(password || ""));
  const accounts = loadAdminAccounts();
  const match = accounts.find(
    (a) => !a.disabled && a.email === normalized && a.passwordSha256 === hash,
  );
  return match || null;
}

/**
 * @param {AdminAccount} account
 */
export function signAdminSession(account) {
  const secret = authSecret();
  if (!secret) {
    throw new Error("AMOJI_AUTH_SECRET is required for admin sessions");
  }
  const now = Date.now();
  const body = {
    schema: ADMIN_SESSION_SCHEMA,
    typ: "admin",
    iat: now,
    exp: now + ADMIN_SESSION_TTL_MS,
    sub: account.id,
    email: account.email,
    role: normalizeAdminRole(account.role),
  };
  const encoded = Buffer.from(JSON.stringify(body)).toString("base64url");
  const sig = crypto.createHmac("sha256", secret).update(encoded).digest("base64url");
  return `${encoded}.${sig}`;
}

/**
 * @param {string} token
 */
export function verifyAdminSession(token) {
  const secret = authSecret();
  if (!secret || !token || typeof token !== "string") return null;
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [encoded, sig] = parts;
  const expected = crypto.createHmac("sha256", secret).update(encoded).digest("base64url");
  try {
    if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  } catch {
    return null;
  }
  try {
    const payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8"));
    if (!payload || payload.schema !== ADMIN_SESSION_SCHEMA || payload.typ !== "admin") {
      return null;
    }
    if (typeof payload.exp === "number" && Date.now() > payload.exp) return null;
    if (!payload.sub || !payload.email) return null;
    return {
      ...payload,
      role: normalizeAdminRole(payload.role),
    };
  } catch {
    return null;
  }
}

/**
 * @returns {boolean}
 */
export function adminAuthConfigured() {
  return loadAdminAccounts().length > 0;
}
