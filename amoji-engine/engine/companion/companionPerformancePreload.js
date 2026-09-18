/**
 * Boot-time performance preload — body motion pose sampling, cloud motion install,
 * and VRM facial expression warm-up.
 */
import { sampleActionBodyPose } from "./companionActionMotion.js";
import {
  primeIdleTalkSpeechFaceCache,
  warmAvatarIdleTalkExpressions,
} from "./companionExpressionPreload.js";
import {
  BOOT_FULL_LIBRARY_WARM_CLIP_IDS,
  primeBootIdleBodyMotions,
} from "./companionIdleMotionPreload.js";
import {
  collectIdlePreloadMotionIds,
  collectWaitPreloadExpressionProfiles,
  collectWaitPreloadMotionIds,
} from "./companionWaitAssets.js";

export const COMPANION_PERFORMANCE_PRELOAD_SCHEMA =
  "amoji.companionPerformancePreload.v2";

/**
 * JIT-warm action pose samplers so first playback avoids cold-start hitch.
 * @param {readonly string[]} [actionIds]
 */
export function primeBodyMotionPoses(actionIds = collectWaitPreloadMotionIds()) {
  const warmed = [];
  for (const id of actionIds) {
    const key = String(id || "").toLowerCase();
    if (!key || key === "stop" || key === "none") continue;
    sampleActionBodyPose(key, 0, 0);
    sampleActionBodyPose(key, 0.35, 0.2);
    sampleActionBodyPose(key, 0.7, 0.4);
    sampleActionBodyPose(key, 1, 0.55);
    warmed.push(key);
  }
  return { ok: true, warmed: warmed.length, motions: warmed };
}

/**
 * Touch each expression blend on the avatar so morph targets compile early.
 * @param {{
 *   applyExpressionProfile?: (profile: object) => unknown,
 *   setEmotion?: (emotion: string) => unknown,
 *   warmExpressionPresets?: () => unknown,
 * }} avatar
 * @param {{
 *   profiles?: Array<{ emotion: string, nuance: string }>,
 *   maxProfiles?: number,
 *   frameDelay?: number,
 * }} [opts]
 */
export async function warmAvatarExpressionProfiles(avatar, opts = {}) {
  if (!avatar) return { ok: false, reason: "no-avatar" };

  if (typeof avatar.warmExpressionPresets === "function") {
    avatar.warmExpressionPresets();
  }

  const profiles =
    opts.profiles || collectWaitPreloadExpressionProfiles();
  const maxProfiles = opts.maxProfiles ?? profiles.length;
  const frameDelay = opts.frameDelay ?? 0;

  if (!avatar.applyExpressionProfile) {
    return {
      ok: Boolean(avatar.warmExpressionPresets),
      warmed: 0,
      reason: avatar.warmExpressionPresets ? "presets-only" : "no-expression-api",
    };
  }

  let warmed = 0;
  for (const profile of profiles.slice(0, maxProfiles)) {
    avatar.applyExpressionProfile(profile);
    warmed += 1;
    if (frameDelay > 0 && typeof requestAnimationFrame === "function") {
      await new Promise((resolve) => {
        setTimeout(() => requestAnimationFrame(resolve), frameDelay);
      });
    }
  }

  avatar.setEmotion?.("neutral");
  avatar.applyExpressionProfile?.({ emotion: "neutral", nuance: "none" });

  return { ok: true, warmed };
}

/**
 * Full performance preload — motions + expressions in parallel.
 * @param {{
 *   avatar?: object | null,
 *   motionClient?: {
 *     ensureWaitMotions?: (ids?: string[]) => Promise<unknown>,
 *     ensureExtensionsPack?: () => Promise<unknown>,
 *     ensurePremiumPack?: () => Promise<unknown>,
 *     ensureFullMotionLibrary?: () => Promise<unknown>,
 *   } | null,
 *   motionIds?: string[],
 *   expressionProfiles?: Array<{ emotion: string, nuance: string }>,
 *   maxExpressionProfiles?: number,
 * }} opts
 */
export async function startPerformancePreload(opts = {}) {
  const motionIds = opts.motionIds || collectWaitPreloadMotionIds();
  const idleMotionIds = collectIdlePreloadMotionIds();
  const fullLibraryIds = BOOT_FULL_LIBRARY_WARM_CLIP_IDS;
  const poseWarm = primeBodyMotionPoses(motionIds);
  primeBodyMotionPoses(idleMotionIds);
  primeBodyMotionPoses(fullLibraryIds);
  const idleTalkPoseWarm = primeBootIdleBodyMotions(fullLibraryIds);
  const speechFaceWarm = primeIdleTalkSpeechFaceCache();

  const motionJob =
    opts.motionClient?.ensureWaitMotions?.(motionIds) ??
    Promise.resolve({ ok: false, reason: "no-motion-client" });
  const extensionsJob =
    opts.motionClient?.ensureFullMotionLibrary?.() ??
    opts.motionClient?.ensurePremiumPack?.() ??
    opts.motionClient?.ensureExtensionsPack?.() ??
    Promise.resolve({ ok: false, reason: "no-extensions-api" });
  const expressionJob = opts.avatar
    ? warmAvatarIdleTalkExpressions(opts.avatar, {
        profiles:
          opts.expressionProfiles || collectWaitPreloadExpressionProfiles(),
        maxProfiles:
          opts.maxExpressionProfiles ??
          collectWaitPreloadExpressionProfiles().length,
      })
    : Promise.resolve({ ok: false, reason: "no-avatar" });

  const [motion, extensions, expressions] = await Promise.all([
    motionJob,
    extensionsJob,
    expressionJob,
  ]);

  return {
    schema: COMPANION_PERFORMANCE_PRELOAD_SCHEMA,
    poses: poseWarm,
    idleTalkPoses: idleTalkPoseWarm,
    speechFace: speechFaceWarm,
    motion,
    extensions,
    expressions,
  };
}
