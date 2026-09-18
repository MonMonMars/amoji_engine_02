/**
 * Local + cloud save sync for pet, raising, chase, and treat state.
 */
import { TREAT_STORAGE_KEY, loadTreatState, saveTreatState } from "../companion/companionTreatStore.js";
import {
  RAISING_STORAGE_KEY,
  loadRaisingState,
  saveRaisingState,
} from "../companion/companionRaisingUi.js";
import { apiFetch, authHeaders, loadAuthSession } from "./companionMobileAuth.js";

export const COMPANION_CLOUD_STORAGE_SCHEMA = "amoji.companionCloudStorage.v1";
export const CHASE_STORAGE_KEY = "amoji.chase.v1";

/**
 * @param {Pick<Storage, "getItem"> | null | undefined} storage
 */
export function loadLocalChaseState(storage = globalThis.localStorage) {
  try {
    const raw = storage?.getItem?.(CHASE_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/**
 * @param {unknown} state
 * @param {Pick<Storage, "setItem"> | null | undefined} storage
 */
export function saveLocalChaseState(state, storage = globalThis.localStorage) {
  try {
    storage?.setItem?.(CHASE_STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* ignore */
  }
}

/**
 * @param {string} characterId
 * @param {Pick<Storage, "getItem"> | null | undefined} storage
 */
export function loadLocalBundle(characterId, storage = globalThis.localStorage) {
  return {
    treats: loadTreatState(storage),
    raising: loadRaisingState(characterId, storage),
    chase: loadLocalChaseState(storage),
    lastCharacterId: characterId,
  };
}

/**
 * @param {string} characterId
 * @param {{
 *   treats?: unknown,
 *   raising?: unknown,
 *   chase?: unknown,
 * }} bundle
 * @param {Pick<Storage, "setItem"> | null | undefined} storage
 */
export function saveLocalBundle(characterId, bundle, storage = globalThis.localStorage) {
  if (bundle.treats) saveTreatState(bundle.treats, storage);
  if (bundle.raising) saveRaisingState(bundle.raising, storage);
  if (bundle.chase) saveLocalChaseState(bundle.chase, storage);
  try {
    storage?.setItem?.("amoji.mobile.lastCharacterId", characterId);
  } catch {
    /* ignore */
  }
}

/**
 * Merge remote save onto local — remote wins on conflicts for entitlements-backed fields.
 * @param {Record<string, unknown>} local
 * @param {Record<string, unknown>} remote
 */
export function mergeCloudSave(local, remote) {
  if (!remote || typeof remote !== "object") return local;
  const next = { ...local, ...remote };
  if (remote.treats && typeof remote.treats === "object") {
    next.treats = { ...(local.treats || {}), ...remote.treats };
  }
  if (remote.raising && typeof remote.raising === "object") {
    next.raising = { ...(local.raising || {}), ...remote.raising };
  }
  if (remote.chase && typeof remote.chase === "object") {
    next.chase = { ...(local.chase || {}), ...remote.chase };
  }
  return next;
}

/**
 * @param {{
 *   characterId?: string,
 *   baseUrl?: string,
 *   storage?: Storage,
 *   token?: string,
 * }} [opts]
 */
export async function pullCloudSave(opts = {}) {
  const session = loadAuthSession(opts.storage);
  const token = opts.token || session?.token;
  if (!token) return null;
  const data = await apiFetch("/api/user/save", {
    method: "GET",
    baseUrl: opts.baseUrl,
    headers: authHeaders(token),
  });
  return data?.save || null;
}

/**
 * @param {Record<string, unknown>} save
 * @param {{ baseUrl?: string, storage?: Storage, token?: string }} [opts]
 */
export async function pushCloudSave(save, opts = {}) {
  const session = loadAuthSession(opts.storage);
  const token = opts.token || session?.token;
  if (!token) return null;
  const data = await apiFetch("/api/user/save", {
    method: "POST",
    baseUrl: opts.baseUrl,
    headers: authHeaders(token),
    body: JSON.stringify({ save }),
  });
  return data?.save || null;
}

/**
 * Pull cloud save, merge into localStorage keys used by companion UI.
 * @param {{
 *   characterId?: string,
 *   baseUrl?: string,
 *   storage?: Storage,
 * }} [opts]
 */
export async function syncFromCloud(opts = {}) {
  const storage = opts.storage ?? globalThis.localStorage;
  const characterId = opts.characterId || storage?.getItem?.("amoji.mobile.lastCharacterId") || "nova";
  const local = loadLocalBundle(characterId, storage);
  const remote = await pullCloudSave(opts);
  if (!remote) return { synced: false, local };
  const merged = mergeCloudSave(local, remote);
  saveLocalBundle(characterId, merged, storage);
  return { synced: true, local: merged, remote };
}

/**
 * Push current local bundle to cloud.
 * @param {{ characterId?: string, baseUrl?: string, storage?: Storage }} [opts]
 */
export async function syncToCloud(opts = {}) {
  const storage = opts.storage ?? globalThis.localStorage;
  const characterId = opts.characterId || storage?.getItem?.("amoji.mobile.lastCharacterId") || "nova";
  const local = loadLocalBundle(characterId, storage);
  const save = {
    treats: local.treats,
    raising: local.raising,
    chase: local.chase,
    lastCharacterId: characterId,
    localKeys: {
      treats: TREAT_STORAGE_KEY,
      raising: RAISING_STORAGE_KEY,
      chase: CHASE_STORAGE_KEY,
    },
  };
  const remote = await pushCloudSave(save, opts);
  return { synced: Boolean(remote), save: remote || save };
}
