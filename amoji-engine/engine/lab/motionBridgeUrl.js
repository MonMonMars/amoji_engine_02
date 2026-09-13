/**
 * Lab motion bridge URL preference (?motionBridge= / localStorage).
 */
export const MOTION_BRIDGE_URL_STORAGE_KEY = "amoji.motionBridgeUrl";
export const MOTION_BRIDGE_URL_SCHEMA = "amoji.motionBridgeUrl.v1";

/**
 * @param {{
 *   search?: string,
 *   storage?: { getItem?: Function, setItem?: Function } | null,
 *   env?: Record<string, string | undefined>,
 *   defaultUrl?: string | null,
 * }} [opts]
 */
export function resolveMotionBridgeConfig(opts = {}) {
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
      params.get("motionBridge") ||
        params.get("bridge") ||
        params.get("AMOJI_MOTION_BRIDGE") ||
        "",
    ).trim();
  } catch {
    fromQuery = "";
  }

  const fromStorage = String(
    storage?.getItem?.(MOTION_BRIDGE_URL_STORAGE_KEY) || "",
  ).trim();
  const fromEnv = String(env.AMOJI_MOTION_BRIDGE || "").trim();

  let url = fromQuery || fromStorage || fromEnv || opts.defaultUrl || null;
  if (url === "off" || url === "none") url = null;

  if (fromQuery && storage?.setItem) {
    try {
      storage.setItem(MOTION_BRIDGE_URL_STORAGE_KEY, fromQuery);
    } catch {
      /* ignore */
    }
  }

  const source = fromQuery
    ? "query"
    : fromStorage
      ? "storage"
      : fromEnv
        ? "env"
        : url
          ? "default"
          : "off";

  return {
    schema: MOTION_BRIDGE_URL_SCHEMA,
    bridgeUrl: url,
    mode: url ? "http" : "off",
    source,
    enabled: Boolean(url),
  };
}

/**
 * @param {string | null} url
 * @param {{ storage?: { setItem?: Function, removeItem?: Function } | null }} [opts]
 */
export function persistMotionBridgeUrl(url, opts = {}) {
  const storage =
    opts.storage === null
      ? null
      : opts.storage ||
        (typeof globalThis.localStorage !== "undefined"
          ? globalThis.localStorage
          : null);
  const next = url && url !== "off" ? String(url).trim() : "";
  try {
    if (!next) storage?.removeItem?.(MOTION_BRIDGE_URL_STORAGE_KEY);
    else storage?.setItem?.(MOTION_BRIDGE_URL_STORAGE_KEY, next);
  } catch {
    /* ignore */
  }
  return next || null;
}
