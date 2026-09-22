#!/usr/bin/env node
/**
 * Print Vercel/local env vars for the first admin account (or add to AMOJI_ADMIN_ACCOUNTS).
 *
 * Usage:
 *   node scripts/bootstrap-admin-account.mjs
 *   node scripts/bootstrap-admin-account.mjs ops@example.com 'YourSecurePass' superadmin
 */
import crypto from "node:crypto";
import { hashAdminPassword } from "../api/_lib/adminAuth.mjs";

const email = String(process.argv[2] || "admin@amoji.local").trim().toLowerCase();
const password =
  process.argv[3] ||
  crypto.randomBytes(9).toString("base64url").replace(/[^a-zA-Z0-9]/g, "x");
const role = String(process.argv[4] || "superadmin").trim().toLowerCase();
const authSecret =
  process.env.AMOJI_AUTH_SECRET ||
  crypto.randomBytes(32).toString("hex");

const id = `admin_${crypto.createHash("sha256").update(email).digest("hex").slice(0, 12)}`;
const passwordSha256 = hashAdminPassword(password);

console.log(`
# Amoji Admin Control — add to Vercel → Settings → Environment Variables (or local .env)
AMOJI_AUTH_SECRET=${authSecret}
AMOJI_ADMIN_EMAIL=${email}
AMOJI_ADMIN_PASSWORD=${password}
AMOJI_ADMIN_ROLE=${role}

# Admin console: https://<your-host>/admin
# Sign in with the email and password above.

# Optional multi-account JSON (password hash only — do not commit plaintext):
# AMOJI_ADMIN_ACCOUNTS=[{"id":"${id}","email":"${email}","passwordSha256":"${passwordSha256}","role":"${role}"}]
`);
