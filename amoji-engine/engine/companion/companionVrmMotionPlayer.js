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
  ONLINE_IDLE_ACTION,
  resolveOnlineMotionClipUrl,
} from "./companionOnlineMotionClips.mjs";

export const COMPANION_VRM_MOTION_PLAYER_SCHEMA =
  "amoji.companionVrmMotionPlayer.v1";

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

  const haltAction = (resetPose) => {
    if (clipAction) {
      clipAction.fadeOut(0.12);
      clipAction.stop();
      clipAction.reset();
      clipAction = null;
    }
    if (mixer) {
      mixer.stopAllAction();
    }
    activeActionId = null;
    if (resetPose) {
      vrm.humanoid?.resetNormalizedPose?.();
    }
  };

  const releasePose = () => {
    haltAction(true);
  };

  const ensureMixer = () => {
    if (!mixer) {
      mixer = new THREE.AnimationMixer(vrm.scene);
      mixer.addEventListener("finished", () => {
        const completed = activeActionId;
        haltAction(false);
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

  const stop = () => {
    haltAction(false);
  };

  /**
   * @param {string} actionId
   * @param {{ loop?: boolean }} [playOpts]
   */
  const play = async (actionId, playOpts = {}) => {
    const id = String(actionId || "").toLowerCase();
    const url = resolveClipUrl(id);
    if (!url) return false;

    const loop = Boolean(
      playOpts.loop ?? isOnlineLoopingLibraryAction(id),
    );
    if (loop && activeActionId === id && clipAction?.isRunning?.()) {
      return true;
    }

    const clip = await loadClip(url);
    if (!clip) return false;

    haltAction(false);
    const mx = ensureMixer();
    clipAction = mx.clipAction(clip);
    clipAction.reset();
    clipAction.setLoop(
      loop ? THREE.LoopRepeat : THREE.LoopOnce,
      loop ? Infinity : 1,
    );
    clipAction.clampWhenFinished = !loop;
    clipAction.fadeIn(0.2);
    clipAction.play();
    activeActionId = id;
    return true;
  };

  const playIdle = async () => play(ONLINE_IDLE_ACTION, { loop: true });

  const update = (dt) => {
    mixer?.update(dt);
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
    isPlaying() {
      return Boolean(activeActionId && clipAction?.isRunning?.());
    },
    isIdle() {
      return isOnlineLoopingLibraryAction(activeActionId) && Boolean(clipAction?.isRunning?.());
    },
    releasePose,
    get activeActionId() {
      return activeActionId;
    },
  };
}
