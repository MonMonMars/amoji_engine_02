import { describe, expect, it, beforeEach, afterEach } from "vitest";
import {
  hashAdminPassword,
  signAdminSession,
  verifyAdminCredentials,
  verifyAdminSession,
} from "../../api/_lib/adminAuth.mjs";

describe("adminAuth", () => {
  const env = { ...process.env };

  beforeEach(() => {
    process.env.AMOJI_AUTH_SECRET = "test-admin-secret";
    process.env.AMOJI_ADMIN_EMAIL = "ops@amoji.test";
    process.env.AMOJI_ADMIN_PASSWORD = "hunter2";
    process.env.AMOJI_ADMIN_ROLE = "operations";
    delete process.env.AMOJI_ADMIN_ACCOUNTS;
  });

  afterEach(() => {
    process.env = { ...env };
  });

  it("hashes passwords deterministically with salt", () => {
    const a = hashAdminPassword("x");
    const b = hashAdminPassword("x");
    expect(a).toBe(b);
    expect(a).not.toBe(hashAdminPassword("y"));
  });

  it("signs and verifies admin sessions", () => {
    const account = verifyAdminCredentials("ops@amoji.test", "hunter2");
    expect(account?.role).toBe("operations");
    const token = signAdminSession(account);
    const payload = verifyAdminSession(token);
    expect(payload?.email).toBe("ops@amoji.test");
    expect(payload?.role).toBe("operations");
    expect(payload?.typ).toBe("admin");
  });
});
