/**
 * Lab robot motion vendor preference (?motion= / localStorage).
 */
import {
  normalizeRobotMotionVendor,
  nextRobotMotionVendor,
  ROBOT_MOTION_VENDORS,
} from "../robot/talkMotion.js";

export const MOTION_VENDOR_PREF_STORAGE_KEY = "amoji.motionVendor";
export const MOTION_VENDOR_PREF_SCHEMA = "amoji.motionVendorPref.v1";

/**
 * @param {string} raw
 * @returns {string}
 */
export function normalizeMotionVendorPref(raw) {
  return normalizeRobotMotionVendor(raw);
}

/**
 * @param {string} vendor
 */
export function nextMotionVendorPref(vendor) {
  return nextRobotMotionVendor(vendor);
}

/**
 * @param {{
 *   search?: string,
 *   storage?: { getItem?: Function, setItem?: Function } | null,
 *   env?: Record<string, string | undefined>,
 *   defaultVendor?: string,
 * }} [opts]
 */
export function resolveMotionVendorPref(opts = {}) {
  const env =
    opts.env ||
    (typeof process !== "undefined" ? process.env : undefined) ||
    {};
  const search =
    opts.search ??
    (typeof globalThis.location !== "undefined"
      ? globalThis.location.search
      : "");
  const storage =
    opts.storage === null
      ? null
      : opts.storage ||
        (typeof globalThis.localStorage !== "undefined"
          ? globalThis.localStorage
          : null);

  let fromQuery = "";
  try {
    const params = new URLSearchParams(search || "");
    fromQuery = String(
      params.get("motion") ||
        params.get("robot") ||
        params.get("AMOJI_MOTION_VENDOR") ||
        "",
    ).trim();
  } catch {
    fromQuery = "";
  }

  const fromStorage = String(
    storage?.getItem?.(MOTION_VENDOR_PREF_STORAGE_KEY) || "",
  ).trim();
  const fromEnv = String(env.AMOJI_MOTION_VENDOR || "").trim();
  const fallback = normalizeRobotMotionVendor(opts.defaultVendor || "sakura");

  let vendor = fallback;
  let source = "default";
  if (fromQuery) {
    vendor = normalizeRobotMotionVendor(fromQuery);
    source = "query";
    try {
      storage?.setItem?.(MOTION_VENDOR_PREF_STORAGE_KEY, vendor);
    } catch {
      /* ignore */
    }
  } else if (fromStorage) {
    vendor = normalizeRobotMotionVendor(fromStorage);
    source = "storage";
  } else if (fromEnv) {
    vendor = normalizeRobotMotionVendor(fromEnv);
    source = "env";
  }

  if (!ROBOT_MOTION_VENDORS.includes(vendor)) {
    vendor = fallback;
    source = "default";
  }

  return {
    schema: MOTION_VENDOR_PREF_SCHEMA,
    vendor,
    source,
    vendors: ROBOT_MOTION_VENDORS.slice(),
  };
}

/**
 * @param {string} vendor
 * @param {{ storage?: { setItem?: Function } | null }} [opts]
 */
export function persistMotionVendorPref(vendor, opts = {}) {
  const next = normalizeRobotMotionVendor(vendor);
  const storage =
    opts.storage === null
      ? null
      : opts.storage ||
        (typeof globalThis.localStorage !== "undefined"
          ? globalThis.localStorage
          : null);
  try {
    storage?.setItem?.(MOTION_VENDOR_PREF_STORAGE_KEY, next);
  } catch {
    /* ignore */
  }
  return next;
}
