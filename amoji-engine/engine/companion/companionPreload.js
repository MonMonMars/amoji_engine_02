/**
 * Companion preload — minimal boot (chat-first), heavy 3D assets in background.
 */
import {
  BOOT_IDLE_WARM_CLIP_IDS,
  getBootIdleMotionPreloadPromise,
  startBootIdleMotionPreload,
} from "./companionIdleMotionPreload.js";

export const COMPANION_PRELOAD_SCHEMA = "amoji.companionPreload.v2";

export const DEFAULT_VRM_URL = "/prototypes/assets/companion-girl.vrm";
export const DEFAULT_MOTIONS_BASIC_URL = "/api/motions?pack=basic";
export const DEFAULT_MOTIONS_EXTENSIONS_URL = "/api/motions?pack=extensions";
export const DEFAULT_MOTIONS_PREMIUM_URL = "/api/motions?pack=premium";

/**
 * @template T
 * @param {Promise<T>} promise
 * @param {number} ms
 * @param {T} fallback
 */
function awaitWithTimeout(promise, ms, fallback) {
  return Promise.race([
    promise,
    new Promise((resolve) => setTimeout(() => resolve(fallback), ms)),
  ]);
}

/** @type {Map<string, Promise<ArrayBuffer>>} */
const vrmBuffers = new Map();

/** @type {Promise<unknown> | null} */
let rosterPreloadPromise = null;

/** @type {Promise<unknown> | null} */
let motionBasicPromise = null;

/** @type {Promise<unknown> | null} */
let vrmModulePromise = null;

/** @type {Promise<unknown> | null} */
let threeModulePromise = null;

/** @type {Promise<unknown> | null} */
let motionExtensionsPromise = null;

/** @type {Promise<unknown> | null} */
let motionPremiumPromise = null;

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

/** @type {Promise<unknown> | null} */
let gltfModulePromise = null;

/**
 * @param {string} url
 * @returns {Promise<ArrayBuffer> | null}
 */
export function getPreloadedVrmPromise(url = DEFAULT_VRM_URL) {
  return vrmBuffers.get(url) ?? null;
}

/**
 * @param {string} url
 * @param {typeof fetch} [fetchImpl]
 */
export function preloadVrmBuffer(url, fetchImpl) {
  const modelUrl = String(url || "").trim();
  if (!modelUrl) return Promise.resolve(null);
  const existing = vrmBuffers.get(modelUrl);
  if (existing) return existing;

  const fetchFn =
    fetchImpl ||
    (typeof globalThis.fetch === "function"
      ? globalThis.fetch.bind(globalThis)
      : null);
  if (!fetchFn) return Promise.resolve(null);

  const job = fetchFn(modelUrl, { credentials: "same-origin" })
    .then((res) => {
      if (!res.ok) throw new Error(`VRM preload HTTP ${res.status}`);
      return res.arrayBuffer();
    })
    .catch((err) => {
      vrmBuffers.delete(modelUrl);
      throw err;
    });
  vrmBuffers.set(modelUrl, job);
  return job;
}

/**
 * @param {string | null | undefined} keepUrl
 */
export function releaseVrmPreloadExcept(keepUrl) {
  const keep = String(keepUrl || "").trim();
  for (const key of [...vrmBuffers.keys()]) {
    if (!keep || key !== keep) vrmBuffers.delete(key);
  }
}

/**
 * @param {string} url
 */
export function releaseVrmPreload(url) {
  vrmBuffers.delete(String(url || "").trim());
}

/**
 * @returns {Promise<unknown> | null}
 */
export function getPreloadedMotionBasicPromise() {
  return motionBasicPromise;
}

/**
 * @returns {Promise<unknown> | null}
 */
export function getPreloadedMotionExtensionsPromise() {
  return motionExtensionsPromise;
}

/**
 * @returns {Promise<unknown> | null}
 */
export function getPreloadedMotionPremiumPromise() {
  return motionPremiumPromise;
}

/**
 * @returns {Promise<typeof import("./vrmAvatar.js")> | null}
 */
export function getPreloadedVrmModulePromise() {
  return vrmModulePromise;
}

/**
 * Schedule work after first paint / idle so chat can boot first.
 * @param {() => void} fn
 */
export function scheduleCompanionBackgroundWork(fn) {
  if (typeof fn !== "function") return;
  if (typeof globalThis.requestIdleCallback === "function") {
    globalThis.requestIdleCallback(() => fn(), { timeout: 2500 });
    return;
  }
  globalThis.setTimeout?.(fn, 48);
}

/**
 * Chat-first boot — no VRM/motion/module warming on page load.
 */
export function startMinimalCompanionPreload() {
  return { schema: COMPANION_PRELOAD_SCHEMA, mode: "minimal" };
}

/**
 * Warm 3D path: selected model buffer, motion packs, Three/VRM modules.
 * @param {{
 *   modelUrl?: string,
 *   motionsUrl?: string,
 *   fetchImpl?: typeof fetch,
 * }} [opts]
 */
export function startHeavyCompanionPreload(opts = {}) {
  const fetchImpl =
    opts.fetchImpl ||
    (typeof globalThis.fetch === "function" ? globalThis.fetch.bind(globalThis) : null);
  const modelUrl = opts.modelUrl || DEFAULT_VRM_URL;
  const motionsUrl = opts.motionsUrl || DEFAULT_MOTIONS_BASIC_URL;

  if (fetchImpl) {
    preloadVrmBuffer(modelUrl, fetchImpl);
  }

  if (fetchImpl && !motionBasicPromise) {
    motionBasicPromise = awaitWithTimeout(
      fetchImpl(motionsUrl, {
        method: "GET",
        headers: { Accept: "application/json" },
      })
        .then((res) => (res.ok ? res.json() : null))
        .catch(() => null),
      12000,
      null,
    );
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
  if (!gltfModulePromise) {
    gltfModulePromise = import("./gltfAvatar.js");
  }

  return {
    schema: COMPANION_PRELOAD_SCHEMA,
    mode: "heavy",
    vrm: vrmBuffers.get(modelUrl) ?? null,
    motionBasic: motionBasicPromise,
    motionExtensions: null,
    motionPremium: null,
    vrmModule: vrmModulePromise,
    threeModule: threeModulePromise,
    waitAssetsModule: waitAssetsModulePromise,
    dialoguePreloadModule: dialoguePreloadModulePromise,
    performancePreloadModule: performancePreloadModulePromise,
    bodyMotionModule: bodyMotionModulePromise,
    contentMotionModule: contentMotionModulePromise,
    gltfModule: gltfModulePromise,
  };
}

/** @deprecated Use startHeavyCompanionPreload */
export function startCompanionPreload(opts = {}) {
  return startHeavyCompanionPreload(opts);
}

export function ensureRosterPreloadStarted() {
  if (rosterPreloadPromise) return rosterPreloadPromise;
  rosterPreloadPromise = import("./companionCharacterPreload.js")
    .then((mod) =>
      mod.startCharacterPreviewPreload({
        onProgress: (ratio) => {
          globalThis.__amojiRosterPreloadPct = ratio;
        },
        onPreviewsReady: () => {
          globalThis.__amojiRosterPreviewsReady = true;
        },
      }).then((result) => {
        globalThis.__amojiRosterModelsReady = Promise.resolve({
          ok: true,
          skipped: true,
        });
        return result;
      }),
    )
    .catch(() => null);
  return rosterPreloadPromise;
}

/** @type {Promise<unknown> | null} */
let rosterModelPreloadPromise = null;

/**
 * Optional full roster model warm-up — after chat + first avatar are up.
 */
export function ensureRosterModelPreloadStarted() {
  if (rosterModelPreloadPromise) return rosterModelPreloadPromise;
  rosterModelPreloadPromise = import("./companionCharacterPreload.js")
    .then((mod) =>
      mod.startCharacterRosterModelPreload({
        onProgress: (ratio) => {
          globalThis.__amojiRosterModelPreloadPct = ratio;
        },
      }),
    )
    .catch(() => null);
  return rosterModelPreloadPromise;
}

/**
 * Defer extension/premium motion packs until after first chat session.
 * @param {typeof fetch} [fetchImpl]
 */
export function scheduleHeavyMotionExtras(fetchImpl) {
  const fetchFn =
    fetchImpl ||
    (typeof globalThis.fetch === "function" ? globalThis.fetch.bind(globalThis) : null);
  if (!fetchFn) return { motionExtensions: null, motionPremium: null };

  if (!motionExtensionsPromise) {
    motionExtensionsPromise = fetchFn(DEFAULT_MOTIONS_EXTENSIONS_URL, {
      method: "GET",
      headers: { Accept: "application/json" },
    })
      .then((res) => (res.ok ? res.json() : null))
      .catch(() => null);
  }

  if (!motionPremiumPromise) {
    motionPremiumPromise = fetchFn(DEFAULT_MOTIONS_PREMIUM_URL, {
      method: "GET",
      headers: { Accept: "application/json" },
    })
      .then((res) => (res.ok ? res.json() : null))
      .catch(() => null);
  }

  return {
    motionExtensions: motionExtensionsPromise,
    motionPremium: motionPremiumPromise,
  };
}

const shouldAutoBoot =
  typeof document !== "undefined" && typeof globalThis.fetch === "function";

const boot = shouldAutoBoot ? startMinimalCompanionPreload() : null;

if (shouldAutoBoot) {
  scheduleCompanionBackgroundWork(ensureRosterPreloadStarted);
}

if (typeof globalThis !== "undefined") {
  globalThis.__amojiPreload = {
    schema: COMPANION_PRELOAD_SCHEMA,
    start: startHeavyCompanionPreload,
    startMinimal: startMinimalCompanionPreload,
    startHeavy: startHeavyCompanionPreload,
    scheduleBackground: scheduleCompanionBackgroundWork,
    getVrm: getPreloadedVrmPromise,
    getModel: getPreloadedVrmPromise,
    getMotionBasic: getPreloadedMotionBasicPromise,
    getMotionExtensions: getPreloadedMotionExtensionsPromise,
    getMotionPremium: getPreloadedMotionPremiumPromise,
    getVrmModule: getPreloadedVrmModulePromise,
    releaseExcept: releaseVrmPreloadExcept,
    rosterReady: rosterPreloadPromise,
    ensureRoster: ensureRosterPreloadStarted,
    ensureRosterModels: ensureRosterModelPreloadStarted,
    scheduleMotionExtras: scheduleHeavyMotionExtras,
    getRosterProgress: () => globalThis.__amojiRosterPreloadPct ?? 0,
    bootIdleMotionIds: BOOT_IDLE_WARM_CLIP_IDS,
    ensureIdleMotions: startBootIdleMotionPreload,
    primeIdleBodyMotions: () => {
      void import("./companionIdleMotionPreload.js").then((mod) => {
        mod.primeBootIdleBodyMotions();
      });
    },
    getIdleMotionPreload: getBootIdleMotionPreloadPromise,
    ready: boot,
  };
}
