export const ADMIN_AUDIT_SCHEMA = "amoji.adminAudit.v1";

const MAX = 400;
const ring = globalThis.__amojiAdminAudit || [];
globalThis.__amojiAdminAudit = ring;

/**
 * @param {{
 *   actorId: string,
 *   actorEmail: string,
 *   actorRole: string,
 *   action: string,
 *   targetUserId?: string,
 *   detail?: Record<string, unknown>,
 * }} entry
 */
export function appendAdminAudit(entry) {
  const row = {
    schema: ADMIN_AUDIT_SCHEMA,
    at: new Date().toISOString(),
    ...entry,
  };
  ring.unshift(row);
  if (ring.length > MAX) ring.length = MAX;
  if (process.env.AMOJI_ADMIN_AUDIT_LOG === "1") {
    console.info("[amoji-admin-audit]", JSON.stringify(row));
  }
  return row;
}

/**
 * @param {{ limit?: number, actorId?: string, targetUserId?: string }} [opts]
 */
export function listAdminAudit(opts = {}) {
  const limit = Math.min(200, Math.max(1, Number(opts.limit) || 50));
  let rows = ring;
  if (opts.actorId) {
    rows = rows.filter((r) => r.actorId === opts.actorId);
  }
  if (opts.targetUserId) {
    rows = rows.filter((r) => r.targetUserId === opts.targetUserId);
  }
  return rows.slice(0, limit);
}
