import { describe, expect, it } from "vitest";
import {
  adminHasPermission,
  adminRoleCapabilities,
  normalizeAdminRole,
} from "../../api/_lib/adminRoles.mjs";

describe("adminRoles", () => {
  it("normalizes unknown roles to viewer", () => {
    expect(normalizeAdminRole("nope")).toBe("viewer");
    expect(normalizeAdminRole("superadmin")).toBe("superadmin");
  });

  it("grants higher roles more permissions", () => {
    expect(adminHasPermission("viewer", "users.read")).toBe(true);
    expect(adminHasPermission("viewer", "users.profile.write")).toBe(false);
    expect(adminHasPermission("support", "users.profile.write")).toBe(true);
    expect(adminHasPermission("support", "users.entitlements.write")).toBe(false);
    expect(adminHasPermission("operations", "users.entitlements.write")).toBe(true);
    expect(adminHasPermission("operations", "admins.accounts.read")).toBe(false);
    expect(adminHasPermission("superadmin", "admins.accounts.read")).toBe(true);
  });

  it("lists capabilities per role", () => {
    const caps = adminRoleCapabilities("support");
    expect(caps.role).toBe("support");
    expect(caps.permissions).toContain("users.profile.write");
    expect(caps.permissions).not.toContain("admins.accounts.read");
  });
});
