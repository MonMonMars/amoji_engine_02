/**
 * Early companion boot preload — fetch VRM + motion pack and warm Three/VRM modules
 * before the main companion script finishes importing.
 */
export const COMPANION_PRELOAD_SCHEMA = "amoji.companionPreload.v1";

export const DEFAULT_VRM_URL = "/prototypes/assets/companion-girl.vrm";
export const DEFAULT_MOTIONS_BASIC_URL = "/api/motions?pack=basic";
export const DEFAULT_MOTIONS_EXTENSIONS_URL = "/api/motions?pack=extensions";

/** @type {Map<string, Promise<ArrayBuffer>>} */
const vrmBuffers = new Map();

/** @type {Promise<unknown> | null} */
let motionBasicPromise = null;

/** @type {Promise<unknown> | null} */
let vrmModulePromise = null;

/** @type {Promise<unknown> | null} */
let threeModulePromise = null;

/** @type {Promise<unknown> | null} */
let motionExtensionsPromise = null;

/** @type {Promise<unknown> | null} */
let waitAssetsModulePromise = null;

/** @type {Promise<unknown> | null} */
let dialoguePreloadModulePromise = null;

/** @type {Promise<unknown> | null} */
let performancePreloadModulePromise = null;

/** @type {Promise<unknown> | null} */
let bodyMotionModulePromise = null;

/** @type {Promise<unknown> | null} */
let contentMotionModulePromise = null;

/**
 * @param {string} url
 * @returns {Promise<ArrayBuffer> | null}
 */
export function getPreloadedVrmPromise(url = DEFAULT_VRM_URL) {
  return vrmBuffers.get(url) ?? null;
}

/**
 * @returns {Promise<unknown> | null}
 */
export function getPreloadedMotionBasicPromise() {
  return motionBasicPromise;
}

/**
 * @returns {Promise<typeof import("./vrmAvatar.js")> | null}
 */
export function getPreloadedVrmModulePromise() {
  return vrmModulePromise;
}

/**
 * @param {{
 *   modelUrl?: string,
 *   motionsUrl?: string,
 *   fetchImpl?: typeof fetch,
 * }} [opts]
 */
export function startCompanionPreload(opts = {}) {
  const fetchImpl =
    opts.fetchImpl ||
    (typeof globalThis.fetch === "function" ? globalThis.fetch.bind(globalThis) : null);
  const modelUrl = opts.modelUrl || DEFAULT_VRM_URL;
  const motionsUrl = opts.motionsUrl || DEFAULT_MOTIONS_BASIC_URL;

  if (fetchImpl && !vrmBuffers.has(modelUrl)) {
    const job = fetchImpl(modelUrl, { credentials: "same-origin" })
      .then((res) => {
        if (!res.ok) throw new Error(`VRM preload HTTP ${res.status}`);
        return res.arrayBuffer();
      })
      .catch((err) => {
        vrmBuffers.delete(modelUrl);
        throw err;
      });
    vrmBuffers.set(modelUrl, job);
  }

  if (fetchImpl && !motionBasicPromise) {
    motionBasicPromise = fetchImpl(motionsUrl, {
      method: "GET",
      headers: { Accept: "application/json" },
    })
      .then((res) => (res.ok ? res.json() : null))
      .catch(() => null);
  }

  if (fetchImpl && !motionExtensionsPromise) {
    motionExtensionsPromise = fetchImpl(DEFAULT_MOTIONS_EXTENSIONS_URL, {
      method: "GET",
      headers: { Accept: "application/json" },
    })
      .then((res) => (res.ok ? res.json() : null))
      .catch(() => null);
  }

  if (!vrmModulePromise) {
    vrmModulePromise = import("./vrmAvatar.js");
  }
  if (!threeModulePromise) {
    threeModulePromise = import("three");
  }
  if (!waitAssetsModulePromise) {
    waitAssetsModulePromise = import("./companionWaitAssets.js");
  }
  if (!dialoguePreloadModulePromise) {
    dialoguePreloadModulePromise = import("./companionDialoguePreload.js");
  }
  if (!performancePreloadModulePromise) {
    performancePreloadModulePromise = import("./companionPerformancePreload.js");
  }
  if (!bodyMotionModulePromise) {
    bodyMotionModulePromise = import("./companionBodyMotion.js");
  }
  if (!contentMotionModulePromise) {
    contentMotionModulePromise = import("./companionContentMotion.js");
  }

  return {
    schema: COMPANION_PRELOAD_SCHEMA,
    vrm: vrmBuffers.get(modelUrl) ?? null,
    motionBasic: motionBasicPromise,
    motionExtensions: motionExtensionsPromise,
    vrmModule: vrmModulePromise,
    threeModule: threeModulePromise,
    waitAssetsModule: waitAssetsModulePromise,
    dialoguePreloadModule: dialoguePreloadModulePromise,
    performancePreloadModule: performancePreloadModulePromise,
    bodyMotionModule: bodyMotionModulePromise,
    contentMotionModule: contentMotionModulePromise,
  };
}

const shouldAutoBoot =
  typeof document !== "undefined" && typeof globalThis.fetch === "function";

const boot = shouldAutoBoot ? startCompanionPreload() : null;

if (typeof globalThis !== "undefined") {
  globalThis.__amojiPreload = {
    schema: COMPANION_PRELOAD_SCHEMA,
    start: startCompanionPreload,
    getVrm: getPreloadedVrmPromise,
    getMotionBasic: getPreloadedMotionBasicPromise,
    getVrmModule: getPreloadedVrmModulePromise,
    ready: boot,
  };
}
