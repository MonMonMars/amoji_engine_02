/**
 * Boot-time idle motion warm-up — tiny procedural pose cache + a few shared VRMA buffers.
 */
import { sampleActionBodyPose } from "./companionActionMotion.js";

export const COMPANION_IDLE_MOTION_PRELOAD_SCHEMA =
  "amoji.companionIdleMotionPreload.v1";

const VRMA_BASE =
  "https://raw.githubusercontent.com/tk256ailab/vrm-viewer/main/VRMA";

/** Procedural idle gestures — no network, prime pose samplers at boot. */
export const BOOT_IDLE_BODY_MOTION_IDS = Object.freeze([
  "nod",
  "wave",
  "thinking",
  "bow",
  "shrug",
  "peace",
]);

/**
 * Shared VRMA stems (~115 KB each) for social clips — not standing rest.
 * Relax is a stretch (standing idle stays procedural); Thinking = wait;
 * Goodbye = wave; LookAround = walk/dance.
 */
export const BOOT_IDLE_VRMA_STEMS = Object.freeze([
  "Relax",
  "Thinking",
  "Goodbye",
  "LookAround",
]);

/** @type {Map<string, ArrayBuffer>} */
const vrmaBuffers = new Map();

/** @type {Promise<{ ok: boolean, loaded: number, total: number }> | null} */
let preloadPromise = null;

/**
 * @returns {string[]}
 */
export function bootIdleVrmaUrls() {
  return BOOT_IDLE_VRMA_STEMS.map((stem) => `${VRMA_BASE}/${stem}.vrma`);
}

/**
 * Prime procedural idle pose math synchronously (no network).
 */
export function primeBootIdleBodyMotions() {
  const warmed = [];
  for (const id of BOOT_IDLE_BODY_MOTION_IDS) {
    sampleActionBodyPose(id, 0, 0);
    sampleActionBodyPose(id, 0.35, 0.2);
    sampleActionBodyPose(id, 0.7, 0.4);
    sampleActionBodyPose(id, 1, 0.55);
    warmed.push(id);
  }
  return { ok: true, warmed: warmed.length, motions: warmed };
}

/**
 * @param {string} url
 * @returns {ArrayBuffer | null}
 */
export function getPreloadedIdleVrmaBuffer(url) {
  const key = String(url || "").trim();
  if (!key) return null;
  return vrmaBuffers.get(key) ?? null;
}

/**
 * Hint the browser to fetch idle VRMA clips during first paint.
 */
export function injectBootIdleMotionHints() {
  if (typeof document === "undefined") return;
  for (const url of bootIdleVrmaUrls()) {
    if (document.querySelector(`link[data-amoji-idle-motion="${url}"]`)) continue;
    const link = document.createElement("link");
    link.rel = "prefetch";
    link.as = "fetch";
    link.crossOrigin = "anonymous";
    link.href = url;
    link.dataset.amojiIdleMotion = url;
    document.head.appendChild(link);
  }
}

/**
 * @param {{ fetchImpl?: typeof fetch }} [opts]
 */
export function startBootIdleMotionPreload(opts = {}) {
  if (preloadPromise) return preloadPromise;

  primeBootIdleBodyMotions();
  injectBootIdleMotionHints();

  const fetchFn =
    opts.fetchImpl ||
    (typeof globalThis.fetch === "function"
      ? globalThis.fetch.bind(globalThis)
      : null);
  if (!fetchFn) {
    preloadPromise = Promise.resolve({ ok: false, loaded: 0, total: 0 });
    return preloadPromise;
  }

  const urls = bootIdleVrmaUrls();
  preloadPromise = Promise.allSettled(
    urls.map(async (url) => {
      if (vrmaBuffers.has(url)) return url;
      const res = await fetchFn(url, {
        method: "GET",
        mode: "cors",
        credentials: "omit",
      });
      if (!res.ok) throw new Error(`idle VRMA HTTP ${res.status}`);
      const buffer = await res.arrayBuffer();
      vrmaBuffers.set(url, buffer);
      return url;
    }),
  ).then((results) => {
    const loaded = results.filter((r) => r.status === "fulfilled").length;
    return { ok: loaded > 0, loaded, total: urls.length };
  });

  return preloadPromise;
}

/**
 * @returns {Promise<{ ok: boolean, loaded: number, total: number }> | null}
 */
export function getBootIdleMotionPreloadPromise() {
  return preloadPromise;
}
