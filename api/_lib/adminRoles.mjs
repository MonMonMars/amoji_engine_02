export const ADMIN_ROLES_SCHEMA = "amoji.adminRoles.v1";

/** @typedef {"viewer" | "support" | "operations" | "superadmin"} AdminRole */

/** @type {AdminRole[]} */
export const ADMIN_ROLES = ["viewer", "support", "operations", "superadmin"];

/** Role rank — higher includes all lower permissions. */
export const ADMIN_ROLE_RANK = {
  viewer: 10,
  support: 20,
  operations: 30,
  superadmin: 40,
};

/**
 * Explicit permission keys (checked in addition to role rank where noted).
 * @type {Record<string, AdminRole[]>}
 */
export const ADMIN_PERMISSION_MIN_ROLE = {
  "dashboard.view": "viewer",
  "users.list": "viewer",
  "users.read": "viewer",
  "users.profile.write": "support",
  "users.settings.write": "support",
  "users.entitlements.write": "operations",
  "users.save.write": "operations",
  "backend.status.read": "operations",
  "backend.iap.read": "operations",
  "audit.read": "support",
  "admins.accounts.read": "superadmin",
  "admins.accounts.write": "superadmin",
};

/**
 * @param {string | null | undefined} role
 * @returns {AdminRole}
 */
export function normalizeAdminRole(role) {
  const r = String(role || "").toLowerCase();
  if (ADMIN_ROLES.includes(/** @type {AdminRole} */ (r))) {
    return /** @type {AdminRole} */ (r);
  }
  return "viewer";
}

/**
 * @param {AdminRole | string | null | undefined} role
 * @param {string} permission
 */
export function adminHasPermission(role, permission) {
  const min = ADMIN_PERMISSION_MIN_ROLE[permission];
  if (!min) return false;
  const r = normalizeAdminRole(role);
  return ADMIN_ROLE_RANK[r] >= ADMIN_ROLE_RANK[normalizeAdminRole(min)];
}

/**
 * @param {AdminRole | string | null | undefined} role
 * @returns {{ role: AdminRole, permissions: string[] }}
 */
export function adminRoleCapabilities(role) {
  const r = normalizeAdminRole(role);
  const permissions = Object.keys(ADMIN_PERMISSION_MIN_ROLE).filter((p) =>
    adminHasPermission(r, p),
  );
  return { role: r, permissions };
}

/**
 * Human-readable role labels for UI.
 * @param {AdminRole} role
 * @param {boolean} [english]
 */
export function adminRoleLabel(role, english = true) {
  const labels = english
    ? {
        viewer: "Viewer (read-only)",
        support: "Support (profiles & settings)",
        operations: "Operations (entitlements & backend)",
        superadmin: "Super Admin (full control)",
      }
    : {
        viewer: "檢視（唯讀）",
        support: "支援（個人資料與設定）",
        operations: "營運（權益與後台）",
        superadmin: "超級管理員（完整權限）",
      };
  return labels[normalizeAdminRole(role)] || labels.viewer;
}
