import { AMOJI_BUILD } from "../../amoji-engine/engine/companion/buildVersion.mjs";
import {
  adminAuthConfigured,
  loadAdminAccounts,
  signAdminSession,
  verifyAdminCredentials,
  verifyAdminSession,
} from "../_lib/adminAuth.mjs";
import {
  adminHasPermission,
  adminRoleCapabilities,
  adminRoleLabel,
  ADMIN_ROLES,
} from "../_lib/adminRoles.mjs";
import { appendAdminAudit, listAdminAudit } from "../_lib/adminAudit.mjs";
import {
  getUserRecord,
  getUserRecordOrNull,
  listUserSummaries,
  mergeEntitlements,
  mergeProfile,
  mergeSave,
  mergeSettings,
  patchUserRecord,
} from "../_lib/userStore.mjs";
import { validateProductionSecrets } from "../_lib/security.mjs";
import { IAP_PRODUCTS } from "../_lib/iapCatalog.mjs";
import { stripeEnabled } from "../_lib/stripeCheckout.mjs";
import {
  applyCors,
  bearerToken,
  handleOptions,
  json,
  readJsonBody,
  requireMethod,
} from "../_lib/http.mjs";
import { applyApiProtection } from "../_lib/security.mjs";

/**
 * @param {import("http").IncomingMessage} req
 * @param {import("http").ServerResponse} res
 * @param {string} permission
 */
async function requireAdmin(req, res, permission) {
  const token = bearerToken(req);
  const session = verifyAdminSession(token);
  if (!session) {
    json(res, 401, { ok: false, error: "Admin session required" });
    return null;
  }
  if (!adminHasPermission(session.role, permission)) {
    json(res, 403, { ok: false, error: "Insufficient admin role", required: permission });
    return null;
  }
  return session;
}

async function handleLogin(req, res) {
  if (!requireMethod(req, res, "POST")) return;
  const guard = applyApiProtection(req, res, {
    rateLimit: { key: "admin-login", max: 12, windowMs: 60_000 },
  });
  if (!guard.ok) {
    json(res, guard.status || 429, { ok: false, error: guard.error });
    return;
  }
  if (!adminAuthConfigured()) {
    json(res, 503, {
      ok: false,
      error: "Admin not configured (set AMOJI_ADMIN_EMAIL + AMOJI_ADMIN_PASSWORD or AMOJI_ADMIN_ACCOUNTS)",
    });
    return;
  }
  const body = readJsonBody(req);
  const account = verifyAdminCredentials(body?.email, body?.password);
  if (!account) {
    json(res, 401, { ok: false, error: "Invalid email or password" });
    return;
  }
  const token = signAdminSession(account);
  appendAdminAudit({
    actorId: account.id,
    actorEmail: account.email,
    actorRole: account.role,
    action: "admin.login",
  });
  json(res, 200, {
    ok: true,
    token,
    admin: {
      id: account.id,
      email: account.email,
      ...adminRoleCapabilities(account.role),
      roleLabel: adminRoleLabel(account.role, true),
    },
    expiresInHours: 8,
  });
}

async function handleSession(req, res) {
  if (!requireMethod(req, res, "GET")) return;
  const session = await requireAdmin(req, res, "dashboard.view");
  if (!session) return;
  json(res, 200, {
    ok: true,
    admin: {
      id: session.sub,
      email: session.email,
      ...adminRoleCapabilities(session.role),
      roleLabel: adminRoleLabel(session.role, true),
    },
    build: AMOJI_BUILD,
    configured: adminAuthConfigured(),
  });
}

async function handleRoles(_req, res) {
  json(res, 200, {
    ok: true,
    roles: ADMIN_ROLES.map((role) => ({
      id: role,
      label: adminRoleLabel(role, true),
      ...adminRoleCapabilities(role),
    })),
  });
}

async function handleUsers(req, res) {
  const session = await requireAdmin(req, res, "users.list");
  if (!session) return;
  if (!requireMethod(req, res, "GET")) return;
  const url = new URL(req.url || "/", "http://localhost");
  const query = url.searchParams.get("q") || "";
  const limit = url.searchParams.get("limit") || "100";
  const users = await listUserSummaries({ query, limit: Number(limit) });
  json(res, 200, { ok: true, count: users.length, users });
}

async function handleUser(req, res) {
  const url = new URL(req.url || "/", "http://localhost");
  const userId = url.searchParams.get("userId") || readJsonBody(req)?.userId;
  if (!userId) {
    json(res, 400, { ok: false, error: "userId required" });
    return;
  }

  if (req.method === "GET") {
    const session = await requireAdmin(req, res, "users.read");
    if (!session) return;
    const record = await getUserRecordOrNull(String(userId));
    if (!record) {
      json(res, 404, { ok: false, error: "User not found" });
      return;
    }
    json(res, 200, {
      ok: true,
      user: {
        userId: record.userId,
        updatedAt: record.updatedAt,
        profile: record.profile,
        settings: record.settings,
        entitlements: record.entitlements,
        save: record.save,
      },
    });
    return;
  }

  if (!requireMethod(req, res, ["PATCH", "POST", "PUT"])) return;
  const session = await requireAdmin(req, res, "users.profile.write");
  if (!session) return;

  const body = readJsonBody(req);
  const record = await getUserRecord(String(userId));
  /** @type {Record<string, unknown>} */
  const patch = {};

  if (body?.profile) {
    if (!adminHasPermission(session.role, "users.profile.write")) {
      json(res, 403, { ok: false, error: "Cannot edit profile" });
      return;
    }
    patch.profile = mergeProfile(record.profile, body.profile);
  }
  if (body?.settings) {
    if (!adminHasPermission(session.role, "users.settings.write")) {
      json(res, 403, { ok: false, error: "Cannot edit settings" });
      return;
    }
    patch.settings = mergeSettings(record.settings, body.settings);
  }
  if (body?.entitlements) {
    if (!adminHasPermission(session.role, "users.entitlements.write")) {
      json(res, 403, { ok: false, error: "Cannot edit entitlements" });
      return;
    }
    patch.entitlements = mergeEntitlements(record.entitlements, body.entitlements);
  }
  if (body?.save) {
    if (!adminHasPermission(session.role, "users.save.write")) {
      json(res, 403, { ok: false, error: "Cannot edit save blob" });
      return;
    }
    patch.save = mergeSave(record.save, body.save);
  }

  if (!Object.keys(patch).length) {
    json(res, 400, { ok: false, error: "No allowed fields in body" });
    return;
  }

  const next = await patchUserRecord(String(userId), patch);
  appendAdminAudit({
    actorId: session.sub,
    actorEmail: session.email,
    actorRole: session.role,
    action: "user.patch",
    targetUserId: String(userId),
    detail: { fields: Object.keys(patch) },
  });
  json(res, 200, { ok: true, userId: next.userId, updatedAt: next.updatedAt, patch: Object.keys(patch) });
}

async function handleBackend(req, res) {
  const session = await requireAdmin(req, res, "backend.status.read");
  if (!session) return;
  if (!requireMethod(req, res, "GET")) return;

  const warnings = validateProductionSecrets();
  json(res, 200, {
    ok: true,
    build: AMOJI_BUILD,
    time: new Date().toISOString(),
    env: {
      nodeEnv: process.env.NODE_ENV || "development",
      vercel: process.env.VERCEL === "1",
      userStoreFs: process.env.AMOJI_USER_STORE_FS === "1",
      upstash: Boolean(process.env.UPSTASH_REDIS_REST_URL),
      authSecret: Boolean(process.env.AMOJI_AUTH_SECRET || process.env.JWT_SECRET),
      adminAccounts: loadAdminAccounts().length,
      iapDev: process.env.AMOJI_IAP_DEV === "1",
      stripe: stripeEnabled(),
      securityAudit: process.env.AMOJI_SECURITY_AUDIT === "1",
      allowedOrigins: (process.env.AMOJI_ALLOWED_ORIGINS || "").split(",").filter(Boolean).length,
    },
    warnings,
    iap: adminHasPermission(session.role, "backend.iap.read")
      ? {
          productCount: IAP_PRODUCTS.length,
          products: IAP_PRODUCTS.map((p) => ({ id: p.id, type: p.type, priceHint: p.priceHint })),
        }
      : null,
  });
}

async function handleAudit(req, res) {
  const session = await requireAdmin(req, res, "audit.read");
  if (!session) return;
  if (!requireMethod(req, res, "GET")) return;
  const url = new URL(req.url || "/", "http://localhost");
  const limit = Number(url.searchParams.get("limit") || "50");
  const targetUserId = url.searchParams.get("userId") || "";
  const rows = listAdminAudit({
    limit,
    targetUserId: targetUserId || undefined,
  });
  json(res, 200, { ok: true, count: rows.length, audit: rows });
}

async function handleAccounts(req, res) {
  const session = await requireAdmin(req, res, "admins.accounts.read");
  if (!session) return;
  if (!requireMethod(req, res, "GET")) return;
  json(res, 200, {
    ok: true,
    accounts: loadAdminAccounts().map((a) => ({
      id: a.id,
      email: a.email,
      role: a.role,
      disabled: Boolean(a.disabled),
    })),
  });
}

/** @type {Record<string, (req: import("http").IncomingMessage, res: import("http").ServerResponse) => Promise<void>>} */
const ROUTES = {
  login: handleLogin,
  session: handleSession,
  roles: handleRoles,
  users: handleUsers,
  user: handleUser,
  backend: handleBackend,
  audit: handleAudit,
  accounts: handleAccounts,
};

export default async function handler(req, res) {
  if (handleOptions(req, res)) return;
  applyCors(res);

  const action = String(req.query?.action || "").toLowerCase();
  const route = ROUTES[action];
  if (!route) {
    json(res, 404, { ok: false, error: "Unknown admin action", actions: Object.keys(ROUTES) });
    return;
  }

  try {
    await route(req, res);
  } catch (err) {
    json(res, 500, { ok: false, error: err?.message || String(err) });
  }
}
