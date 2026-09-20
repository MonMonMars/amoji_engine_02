#!/usr/bin/env node
/**
 * Admin console smoke (unit-level + optional live API).
 *   node scripts/admin-console-verify.mjs
 *   VERIFY_BASE_URL=https://your-app.vercel.app AMOJI_ADMIN_EMAIL=... AMOJI_ADMIN_PASSWORD=... node scripts/admin-console-verify.mjs
 */
import {
  verifyAdminCredentials,
  signAdminSession,
  verifyAdminSession,
  adminAuthConfigured,
} from "../api/_lib/adminAuth.mjs";
import { adminHasPermission } from "../api/_lib/adminRoles.mjs";
import { getUserRecord, listUserSummaries } from "../api/_lib/userStore.mjs";

process.env.AMOJI_AUTH_SECRET = process.env.AMOJI_AUTH_SECRET || "admin-verify-secret";
if (!process.env.AMOJI_ADMIN_EMAIL) {
  process.env.AMOJI_ADMIN_EMAIL = "admin@amoji.local";
  process.env.AMOJI_ADMIN_PASSWORD = "admin-dev-pass";
  process.env.AMOJI_ADMIN_ROLE = "superadmin";
}

const account = verifyAdminCredentials(
  process.env.AMOJI_ADMIN_EMAIL,
  process.env.AMOJI_ADMIN_PASSWORD,
);
if (!account) {
  console.error("FAIL bootstrap admin credentials");
  process.exit(1);
}
const token = signAdminSession(account);
const session = verifyAdminSession(token);
if (!session || !adminHasPermission(session.role, "users.list")) {
  console.error("FAIL admin session");
  process.exit(1);
}

await getUserRecord("guest_verify_smoke");
const users = await listUserSummaries({ limit: 5 });
console.log("PASS local admin auth + user store", {
  configured: adminAuthConfigured(),
  role: session.role,
  userSample: users.length,
});

const base = process.env.VERIFY_BASE_URL;
if (base) {
  const loginRes = await fetch(`${base.replace(/\/$/, "")}/api/admin/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: process.env.AMOJI_ADMIN_EMAIL,
      password: process.env.AMOJI_ADMIN_PASSWORD,
    }),
  });
  const login = await loginRes.json();
  if (!loginRes.ok) {
    console.error("FAIL production login", login);
    process.exit(1);
  }
  console.log("PASS production admin login", { role: login.admin?.role });
}
