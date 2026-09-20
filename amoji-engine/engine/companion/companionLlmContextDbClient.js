/**
 * Sync LLM context database with /api/user/save when logged in.
 */
import { loadAuthSession } from "../mobile/companionMobileAuth.js";
import { apiFetch } from "../mobile/companionMobileAuth.js";
import {
  llmContextDbForCloudSave,
  mergeCloudLlmContextDb,
} from "./companionLlmContextDb.js";

export const LLM_CONTEXT_DB_CLIENT_SCHEMA = "amoji.companionLlmContextDbClient.v1";

/**
 * @param {{ storage?: Storage | null, baseUrl?: string }} [opts]
 */
export async function pullLlmContextDbFromCloud(opts = {}) {
  const storage = opts.storage ?? globalThis.localStorage ?? null;
  const session = loadAuthSession(storage);
  if (!session?.token) return { ok: false, reason: "guest" };
  try {
    const data = await apiFetch("/api/user/save?action=save", {
      method: "GET",
      headers: { Authorization: `Bearer ${session.token}` },
      baseUrl: opts.baseUrl,
    });
    const remote = data?.save?.llmContextDb;
    if (remote) mergeCloudLlmContextDb(remote, storage);
    return { ok: true, merged: Boolean(remote) };
  } catch (err) {
    return { ok: false, reason: err?.message || "pull-failed" };
  }
}

/**
 * @param {{ storage?: Storage | null, baseUrl?: string }} [opts]
 */
export async function pushLlmContextDbToCloud(opts = {}) {
  const storage = opts.storage ?? globalThis.localStorage ?? null;
  const session = loadAuthSession(storage);
  if (!session?.token) return { ok: false, reason: "guest" };
  const llmContextDb = llmContextDbForCloudSave(storage);
  try {
    await apiFetch("/api/user/save?action=save", {
      method: "POST",
      headers: { Authorization: `Bearer ${session.token}` },
      baseUrl: opts.baseUrl,
      body: JSON.stringify({ save: { llmContextDb } }),
    });
    return { ok: true };
  } catch (err) {
    return { ok: false, reason: err?.message || "push-failed" };
  }
}
