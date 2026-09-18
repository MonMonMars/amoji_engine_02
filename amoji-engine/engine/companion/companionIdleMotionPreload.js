/**
 * Boot-time idle + talk motion warm-up — procedural pose cache + shared VRMA buffers.
 */
import { sampleActionBodyPose } from "./companionActionMotion.js";
import { PLAYABLE_ACTIONS } from "./companionActionCatalog.js";
import {
  IDLE_LIFE_CLIP_POOL,
  IDLE_SHOWCASE_POOL,
} from "./companionActionChoreography.js";
import {
  ONLINE_CALM_IDLE_ACTION,
  ONLINE_MOTION_CLIP_FILES,
  ONLINE_TALK_LOOP_ACTIONS,
  resolveOnlineMotionClipFile,
} from "./companionOnlineMotionClips.mjs";
import {
  CLOUD_EXTENSION_MOTIONS,
  PREMIUM_EXTENSION_MOTIONS,
} from "./motionPackData.mjs";
import {
  TALK_BACKGROUND_LIBRARY_ACTIONS,
  TALK_STYLE_LIBRARY_ACTIONS,
} from "./companionTalkMotionLibrary.mjs";
import { PRIORITY_REPLY_MOTION_IDS } from "./companionWaitAssets.js";

export const COMPANION_IDLE_MOTION_PRELOAD_SCHEMA =
  "amoji.companionIdleMotionPreload.v5";

/** Every action id mapped in the hosted online VRMA library. */
export const ONLINE_LIBRARY_ACTION_IDS = Object.freeze([
  ...new Set([
    ...Object.keys(ONLINE_MOTION_CLIP_FILES),
    ...Object.keys(CLOUD_EXTENSION_MOTIONS),
    ...Object.keys(PREMIUM_EXTENSION_MOTIONS),
    ...PLAYABLE_ACTIONS,
  ]),
]);

/** More sample times along each clip — idle/talk hit these paths constantly. */
export const IDLE_TALK_BODY_SAMPLE_TIMES = Object.freeze([
  0, 0.12, 0.25, 0.38, 0.5, 0.62, 0.75, 0.88, 1,
]);

const VRMA_BASE =
  "https://raw.githubusercontent.com/tk256ailab/vrm-viewer/main/VRMA";

/** Full hosted library — prefetch all stems so any idle / reply clip is instant. */
export const HOSTED_VRMA_STEMS = Object.freeze([
  "Relax",
  "Thinking",
  "Goodbye",
  "LookAround",
  "Clapping",
  "Surprised",
  "Angry",
  "Sad",
  "Sleepy",
  "Jump",
  "Blush",
]);

/**
 * @param {readonly string[]} actionIds
 * @returns {string[]}
 */
export function uniqueVrmaStemsForActions(actionIds) {
  const stems = new Set();
  for (const id of actionIds) {
    const file = resolveOnlineMotionClipFile(id);
    if (file) stems.add(file);
  }
  return [...stems].sort();
}

/** Talk-mode loops + style-mapped clips to warm before first speech. */
export const BOOT_TALK_WARM_CLIP_IDS = Object.freeze([
  ...new Set([
    ...ONLINE_TALK_LOOP_ACTIONS,
    ...TALK_BACKGROUND_LIBRARY_ACTIONS,
    ...Object.values(TALK_STYLE_LIBRARY_ACTIONS),
    "nod",
    "wave",
    "clap",
    "celebrate",
  ]),
]);

/** VRMA files required for calm idle + idle-life one-shots. */
export const IDLE_LIFE_VRMA_STEMS = Object.freeze(
  uniqueVrmaStemsForActions([
    ONLINE_CALM_IDLE_ACTION,
    ...IDLE_LIFE_CLIP_POOL,
    ...BOOT_TALK_WARM_CLIP_IDS,
  ]),
);

/** Boot prefetch: entire library + every idle-life / talk stem (deduped). */
export const BOOT_IDLE_VRMA_STEMS = Object.freeze([
  ...new Set([...HOSTED_VRMA_STEMS, ...IDLE_LIFE_VRMA_STEMS]),
]);

/** Procedural fallback — prime samplers for idle-life, showcase, talk, and reply clips. */
export const BOOT_IDLE_BODY_MOTION_IDS = Object.freeze([
  ...new Set([
    ONLINE_CALM_IDLE_ACTION,
    ...IDLE_LIFE_CLIP_POOL,
    ...IDLE_SHOWCASE_POOL,
    ...BOOT_TALK_WARM_CLIP_IDS,
    ...PRIORITY_REPLY_MOTION_IDS,
    "wave",
    "clap",
    "celebrate",
    "point",
    "salute",
    "thumbsup",
    "laugh",
  ]),
]);

/** Warm these clip ids once the avatar is ready (VRMA-first body). */
export const BOOT_IDLE_WARM_CLIP_IDS = Object.freeze([
  ...new Set([
    ONLINE_CALM_IDLE_ACTION,
    ...BOOT_IDLE_BODY_MOTION_IDS,
    ...IDLE_LIFE_CLIP_POOL,
    ...BOOT_TALK_WARM_CLIP_IDS,
  ]),
]);

/** Full online library — every hosted action id for idle + talk + reply. */
export const BOOT_FULL_LIBRARY_WARM_CLIP_IDS = Object.freeze([
  ...new Set([
    ...BOOT_IDLE_WARM_CLIP_IDS,
    ...ONLINE_LIBRARY_ACTION_IDS,
    ...IDLE_SHOWCASE_POOL,
    ...PRIORITY_REPLY_MOTION_IDS,
  ]),
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
export function primeBootIdleBodyMotions(
  actionIds = BOOT_FULL_LIBRARY_WARM_CLIP_IDS,
) {
  const warmed = [];
  for (const id of actionIds) {
    for (let i = 0; i < IDLE_TALK_BODY_SAMPLE_TIMES.length; i += 1) {
      const t = IDLE_TALK_BODY_SAMPLE_TIMES[i];
      sampleActionBodyPose(id, t, t * 0.55);
    }
    warmed.push(id);
  }
  return { ok: true, warmed: warmed.length, motions: warmed };
}

/**
 * Warm parsed VRMA clips on a motion player (dedupes by URL internally).
 * @param {{ warmClip?: (id: string) => unknown } | null | undefined} motionPlayer
 * @param {readonly string[]} [actionIds]
 */
export function warmMotionClipBatch(
  motionPlayer,
  actionIds = BOOT_FULL_LIBRARY_WARM_CLIP_IDS,
) {
  if (!motionPlayer?.warmClip) return { ok: false, warmed: 0 };
  let warmed = 0;
  for (const id of actionIds) {
    void motionPlayer.warmClip(id);
    warmed += 1;
  }
  return { ok: true, warmed };
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
