/**
 * Play VRMA clips from the online motion library on a loaded VRM avatar.
 */
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import {
  createVRMAnimationClip,
  VRMAnimationLoaderPlugin,
} from "@pixiv/three-vrm-animation";
import { resolveOnlineMotionClipUrl } from "./companionOnlineMotionClips.mjs";

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

  const ensureMixer = () => {
    if (!mixer) {
      mixer = new THREE.AnimationMixer(vrm.scene);
      mixer.addEventListener("finished", () => {
        const completed = activeActionId;
        activeActionId = null;
        clipAction = null;
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
        const gltf = await loader.loadAsync(url);
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
    clipAction?.stop();
    clipAction = null;
    activeActionId = null;
  };

  /**
   * @param {string} actionId
   * @param {{ loop?: boolean }} [playOpts]
   */
  const play = async (actionId, playOpts = {}) => {
    const id = String(actionId || "").toLowerCase();
    const url = resolveClipUrl(id);
    if (!url) return false;

    const clip = await loadClip(url);
    if (!clip) return false;

    stop();
    const mx = ensureMixer();
    clipAction = mx.clipAction(clip);
    clipAction.reset();
    clipAction.setLoop(
      playOpts.loop ? THREE.LoopRepeat : THREE.LoopOnce,
      playOpts.loop ? Infinity : 1,
    );
    clipAction.clampWhenFinished = true;
    clipAction.play();
    activeActionId = id;
    return true;
  };

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
    stop,
    update,
    warmClip,
    isPlaying() {
      return Boolean(activeActionId && clipAction?.isRunning());
    },
    get activeActionId() {
      return activeActionId;
    },
  };
}
