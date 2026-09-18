/**
 * Play VRMA clips from the online motion library on a loaded VRM avatar.
 */
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import {
  createVRMAnimationClip,
  VRMAnimationLoaderPlugin,
} from "@pixiv/three-vrm-animation";
import { getPreloadedIdleVrmaBuffer } from "./companionIdleMotionPreload.js";
import {
  isOnlineLoopingLibraryAction,
  ONLINE_CALM_IDLE_ACTION,
  resolveOnlineMotionClipUrl,
} from "./companionOnlineMotionClips.mjs";
import { DEFAULT_MOTION_CROSSFADE_SEC } from "./vrmMotionTransition.js";

export const COMPANION_VRM_MOTION_PLAYER_SCHEMA =
  "amoji.companionVrmMotionPlayer.v3";

/**
 * @param {{
 *   vrm: import('@pixiv/three-vrm').VRM,
 *   resolveClipUrl?: (actionId: string) => string | null,
 *   onComplete?: (actionId: string | null) => void,
 * }} opts
 */
export function createVrmMotionPlayer(opts) {
  const vrm = opts.vrm;
  const resolveClipUrl =
    opts.resolveClipUrl || ((actionId) => resolveOnlineMotionClipUrl(actionId));

  const loader = new GLTFLoader();
  loader.register((parser) => new VRMAnimationLoaderPlugin(parser));

  /** @type {THREE.AnimationMixer | null} */
  let mixer = null;
  /** @type {THREE.AnimationAction | null} */
  let clipAction = null;
  /** @type {string | null} */
  let activeActionId = null;
  /** @type {Map<string, THREE.AnimationClip>} */
  const clipCache = new Map();
  /** @type {Map<string, Promise<THREE.AnimationClip | null>>} */
  const inflight = new Map();
  /** @type {{ action: THREE.AnimationAction, stopAtMs: number }[]} */
  let retiringActions = [];
  let crossfadeUntilMs = 0;

  const scheduleRetireAction = (action, transitionSec) => {
    if (!action) return;
    retiringActions.push({
      action,
      stopAtMs: performance.now() + transitionSec * 1000 + 80,
    });
  };

  const cleanupRetiredActions = () => {
    if (!retiringActions.length) return;
    const now = performance.now();
    retiringActions = retiringActions.filter(({ action, stopAtMs }) => {
      if (now < stopAtMs) return true;
      try {
        action.stop();
        action.reset();
      } catch {
        /* ignore */
      }
      return false;
    });
  };

  const stopActionInstance = (action, transitionSec = 0.12) => {
    if (!action) return;
    try {
      if (transitionSec > 0 && action.isRunning?.()) {
        action.fadeOut(transitionSec);
        scheduleRetireAction(action, transitionSec);
        return;
      }
      action.stop();
      action.reset();
    } catch {
      /* ignore */
    }
  };

  const haltAction = (resetPose, transitionSec = 0) => {
    if (clipAction) {
      stopActionInstance(clipAction, transitionSec);
      clipAction = null;
    }
    activeActionId = null;
    if (resetPose) {
      vrm.humanoid?.resetNormalizedPose?.();
    }
  };

  const releasePose = (transitionSec = DEFAULT_MOTION_CROSSFADE_SEC) => {
    haltAction(false, transitionSec);
  };

  const ensureMixer = () => {
    if (!mixer) {
      mixer = new THREE.AnimationMixer(vrm.scene);
      mixer.addEventListener("finished", () => {
        if (clipAction) {
          clipAction.clampWhenFinished = true;
          clipAction.paused = true;
        }
        const completed = activeActionId;
        opts.onComplete?.(completed);
      });
    }
    return mixer;
  };

  const loadClip = async (url) => {
    if (clipCache.has(url)) return clipCache.get(url) || null;
    if (inflight.has(url)) return inflight.get(url);

    const job = (async () => {
      try {
        const preloaded = getPreloadedIdleVrmaBuffer(url);
        const gltf = preloaded
          ? await loader.parseAsync(preloaded, url)
          : await loader.loadAsync(url);
        const vrmAnimation = gltf.userData?.vrmAnimations?.[0];
        if (!vrmAnimation) return null;
        const clip = createVRMAnimationClip(vrmAnimation, vrm);
        clipCache.set(url, clip);
        return clip;
      } catch (err) {
        console.warn("[vrm-motion] clip load failed", url, err);
        clipCache.set(url, null);
        return null;
      } finally {
        inflight.delete(url);
      }
    })();

    inflight.set(url, job);
    return job;
  };

  const stop = (transitionSec = DEFAULT_MOTION_CROSSFADE_SEC) => {
    haltAction(false, transitionSec);
  };

  /**
   * @param {string} actionId
   * @param {{ loop?: boolean, transitionSec?: number }} [playOpts]
   */
  const play = async (actionId, playOpts = {}) => {
    const id = String(actionId || "").toLowerCase();
    const url = resolveClipUrl(id);
    if (!url) return false;

    const loop = Boolean(
      playOpts.loop ?? isOnlineLoopingLibraryAction(id),
    );
    const transitionSec =
      Number(playOpts.transitionSec) > 0
        ? Number(playOpts.transitionSec)
        : DEFAULT_MOTION_CROSSFADE_SEC;

    if (loop && activeActionId === id && clipAction?.isRunning?.()) {
      if (clipAction.paused) clipAction.paused = false;
      return true;
    }

    const clip = await loadClip(url);
    if (!clip) return false;

    const mx = ensureMixer();
    const previousAction = clipAction?.paused ? clipAction : clipAction;
    if (previousAction?.paused) {
      previousAction.paused = false;
    }

    const nextAction = mx.clipAction(clip);
    nextAction.reset();
    nextAction.setLoop(
      loop ? THREE.LoopRepeat : THREE.LoopOnce,
      loop ? Infinity : 1,
    );
    nextAction.clampWhenFinished = !loop;
    nextAction.setEffectiveWeight(1);
    nextAction.play();

    if (previousAction && previousAction !== nextAction) {
      nextAction.crossFadeFrom(previousAction, transitionSec, true);
      scheduleRetireAction(previousAction, transitionSec);
      crossfadeUntilMs = performance.now() + transitionSec * 1000 + 40;
    } else {
      nextAction.fadeIn(transitionSec);
      crossfadeUntilMs = performance.now() + transitionSec * 1000 + 40;
    }

    clipAction = nextAction;
    activeActionId = id;
    return true;
  };

  const playIdle = async (playOpts = {}) =>
    play(ONLINE_CALM_IDLE_ACTION, { loop: true, ...playOpts });

  const update = (dt) => {
    mixer?.update(dt);
    cleanupRetiredActions();
  };

  const warmClip = async (actionId) => {
    const url = resolveClipUrl(String(actionId || "").toLowerCase());
    if (!url) return false;
    return Boolean(await loadClip(url));
  };

  return {
    schema: COMPANION_VRM_MOTION_PLAYER_SCHEMA,
    play,
    playIdle,
    stop,
    update,
    warmClip,
    isAnimating() {
      return Boolean(activeActionId && clipAction?.isRunning?.());
    },
    isHoldingLastFrame() {
      return Boolean(activeActionId && clipAction?.paused);
    },
    isPlaying() {
      return Boolean(
        activeActionId &&
          clipAction &&
          (clipAction.isRunning?.() || clipAction.paused),
      );
    },
    isIdle() {
      return (
        String(activeActionId || "").toLowerCase() === ONLINE_CALM_IDLE_ACTION &&
        Boolean(clipAction?.isRunning?.() || clipAction?.paused)
      );
    },
    releasePose,
    get activeActionId() {
      return activeActionId;
    },
    get crossfadeSec() {
      return DEFAULT_MOTION_CROSSFADE_SEC;
    },
    isCrossfading() {
      return performance.now() < crossfadeUntilMs || retiringActions.length > 0;
    },
    getTransitionStatus() {
      return {
        activeActionId,
        crossfading: performance.now() < crossfadeUntilMs,
        retiringActions: retiringActions.length,
      };
    },
  };
}
