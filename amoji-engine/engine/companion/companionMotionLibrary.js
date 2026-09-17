/**
 * Motion install registry — bundled basics, cloud basic pack, on-demand extensions.
 */
import {
  BUNDLED_MOTION_IDS,
  CLOUD_EXTENSION_MOTIONS,
  getCloudMotionDef,
} from "./motionPackData.mjs";
import { ACTION_CATALOG, getActionDef, PLAYABLE_ACTIONS } from "./companionActionCatalog.js";

export const COMPANION_MOTION_LIBRARY_SCHEMA = "amoji.companionMotionLibrary.v1";
export const MOTION_INSTALL_STORAGE_KEY = "amoji.companion.motionInstall.v1";

/** @typedef {{ version: number, installed: Record<string, { at: number, pack?: string, tier?: string }>, basicPackVersion?: number }} MotionInstallState */

/**
 * @param {typeof globalThis.localStorage | null | undefined} storage
 */
export function loadMotionInstallState(storage = null) {
  const store = storage ?? safeStorage();
  /** @type {MotionInstallState} */
  const state = { version: 1, installed: {}, basicPackVersion: 0 };
  if (!store) return state;
  try {
    const raw = store.getItem(MOTION_INSTALL_STORAGE_KEY);
    if (!raw) return state;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object") {
      state.version = parsed.version || 1;
      state.installed = parsed.installed || {};
      state.basicPackVersion = parsed.basicPackVersion || 0;
    }
  } catch {
    /* ignore corrupt storage */
  }
  for (const id of BUNDLED_MOTION_IDS) {
    if (!state.installed[id]) {
      state.installed[id] = { at: 0, tier: "bundled" };
    }
  }
  return state;
}

/**
 * @param {MotionInstallState} state
 * @param {typeof globalThis.localStorage | null | undefined} storage
 */
export function saveMotionInstallState(state, storage = null) {
  const store = storage ?? safeStorage();
  if (!store) return false;
  try {
    store.setItem(MOTION_INSTALL_STORAGE_KEY, JSON.stringify(state));
    return true;
  } catch {
    return false;
  }
}

/**
 * @param {string | null | undefined} actionId
 * @param {MotionInstallState} [state]
 */
export function isBundledMotion(actionId) {
  const id = String(actionId || "").toLowerCase();
  return BUNDLED_MOTION_IDS.includes(id);
}

/**
 * @param {string | null | undefined} actionId
 * @param {MotionInstallState} [state]
 */
export function isCloudExtensionMotion(actionId) {
  return Boolean(getCloudMotionDef(actionId));
}

/**
 * @param {string | null | undefined} actionId
 * @param {MotionInstallState} [state]
 */
export function isMotionInstalled(actionId, state = loadMotionInstallState()) {
  const id = String(actionId || "").toLowerCase();
  if (!id || id === "none" || id === "stop") return true;
  if (isBundledMotion(id)) return true;
  if (getActionDef(id) && PLAYABLE_ACTIONS.includes(id)) {
    return Boolean(state.installed[id]);
  }
  if (isCloudExtensionMotion(id)) {
    return Boolean(state.installed[id]);
  }
  return false;
}

/**
 * @param {string} actionId
 * @param {MotionInstallState} state
 * @param {{ pack?: string, tier?: string }} [meta]
 */
export function markMotionInstalled(actionId, state, meta = {}) {
  const id = String(actionId || "").toLowerCase();
  if (!id) return state;
  state.installed[id] = {
    at: Date.now(),
    pack: meta.pack,
    tier: meta.tier,
  };
  return state;
}

/**
 * @param {string[]} motionIds
 * @param {MotionInstallState} state
 * @param {{ pack?: string, tier?: string }} [meta]
 */
export function markMotionsInstalled(motionIds, state, meta = {}) {
  for (const id of motionIds) {
    markMotionInstalled(id, state, meta);
  }
  return state;
}

/**
 * Merge cloud extension defs into runtime action lookup.
 * @param {string | null | undefined} actionId
 */
export function getExtendedActionDef(actionId) {
  const id = String(actionId || "").toLowerCase();
  const catalog = getActionDef(id);
  if (catalog) return catalog;
  const cloud = getCloudMotionDef(id);
  if (!cloud) return null;
  const base = cloud.extends ? getActionDef(cloud.extends) : null;
  return {
    duration: cloud.duration ?? base?.duration ?? 1.6,
    loops: cloud.loops ?? base?.loops ?? false,
    emotion: cloud.emotion ?? base?.emotion ?? "neutral",
    keywords: cloud.keywords || [],
    aliases: cloud.aliases || [],
    extends: cloud.extends,
    label: cloud.label,
  };
}

/**
 * Resolve clip inheritance — cloud extensions reuse hosted VRMA from `extends`.
 * @param {string | null | undefined} actionId
 */
export function resolveMotionSamplerKey(actionId) {
  const id = String(actionId || "").toLowerCase();
  const cloud = getCloudMotionDef(id);
  if (cloud?.extends) return cloud.extends;
  return id;
}

/**
 * @param {MotionInstallState} state
 */
export function listInstalledMotionIds(state = loadMotionInstallState()) {
  return Object.keys(state.installed).sort();
}

/**
 * @param {MotionInstallState} state
 */
export function installedMotionCount(state = loadMotionInstallState()) {
  return Object.keys(state.installed).length;
}

function safeStorage() {
  try {
    if (typeof globalThis.localStorage !== "undefined") {
      return globalThis.localStorage;
    }
  } catch {
    /* private mode */
  }
  return null;
}

export { BUNDLED_MOTION_IDS, CLOUD_EXTENSION_MOTIONS };
