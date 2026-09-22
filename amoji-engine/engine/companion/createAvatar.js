import {
  HIGH_POLY_FACE_CHARACTER_IDS,
  resolveCharacterId,
} from "./companionCharacterCatalog.js";
import { defaultVrmModelFetchUrl } from "./companionModelAssets.mjs";
import { isIosLike } from "./companionPlatform.js";
import { preloadVrmBuffer } from "./companionPreload.js";

export const COMPANION_AVATAR_SCHEMA = "amoji.createAvatar.v2-highpoly-timeout";

/** Default VRM load budget (download + parse) on fast desktop networks. */
export const AVATAR_LOAD_TIMEOUT_MS = 45_000;

/** Kizuna-class HD VRM (~19MB, 70k+ tris) needs extra time on mobile / 3G. */
export const HIGH_POLY_AVATAR_LOAD_TIMEOUT_MS = 120_000;

/**
 * Replace canvas so a failed WebGL context does not block the next renderer.
 * @param {HTMLCanvasElement} canvas
 * @returns {HTMLCanvasElement}
 */
export function replaceAvatarCanvas(canvas) {
  const live =
    (canvas?.id && globalThis.document?.getElementById?.(canvas.id)) || canvas;
  const parent = live?.parentNode;
  if (!parent) return live || canvas;
  const fresh = live.cloneNode(false);
  fresh.id = live.id;
  fresh.className = live.className;
  const aria = live.getAttribute("aria-label");
  if (aria) fresh.setAttribute("aria-label", aria);
  parent.replaceChild(fresh, live);
  return fresh;
}

/**
 * No-op avatar used while the real 3D model loads — keeps chat/voice alive.
 */
export function createStubAvatar() {
  const noop = () => {};
  return {
    resize: noop,
    setEmotion: noop,
    setListening: noop,
    setMouthOpen: noop,
    setMouthShape: noop,
    setTalking: noop,
    setEating: noop,
    setTalkEnergy: noop,
    setTalkStyle: noop,
    reactToTap: noop,
    reactToSpeechChunk: noop,
    playGestureForText: noop,
    playAction: noop,
    playActionSequence: noop,
    stopAction: noop,
    applyExpressionProfile: noop,
    applyContentFromReply: () => ({ emotion: "neutral", talkStyle: "explain" }),
    setThinking: noop,
    applyStreamingContent: () => ({ emotion: "thinking", talkStyle: "thinking" }),
    prepareThinkingFromUser: () => ({ emotion: "thinking", talkStyle: "thinking" }),
    getFaceProfile: () => null,
    resetCameraView: noop,
    hitTest: () => false,
    setSceneEnvironment: noop,
    playCalmIdle: noop,
  };
}

/**
 * @template T
 * @param {Promise<T>} promise
 * @param {number} ms
 * @param {string} [label]
 * @returns {Promise<T>}
 */
/**
 * @param {string | null | undefined} characterId
 * @param {number} [overrideMs]
 */
export function resolveAvatarLoadTimeoutMs(characterId, overrideMs) {
  if (Number.isFinite(overrideMs) && overrideMs > 0) return overrideMs;
  const id = String(characterId || "").toLowerCase();
  if (HIGH_POLY_FACE_CHARACTER_IDS.has(id)) {
    return HIGH_POLY_AVATAR_LOAD_TIMEOUT_MS;
  }
  if (isIosLike()) return 60_000;
  if (typeof navigator !== "undefined") {
    const et = navigator.connection?.effectiveType;
    if (et === "slow-2g" || et === "2g") return 120_000;
    if (et === "3g") return 90_000;
  }
  return AVATAR_LOAD_TIMEOUT_MS;
}

function withLoadTimeout(promise, ms, label = "avatar") {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`${label}-timeout`)),
      ms,
    );
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      },
    );
  });
}

export function shouldSkipGltfFallback(modelUrl, prefer) {
  if (prefer === "gltf") return false;
  return Boolean(modelUrl && /\.vrm($|\?)/i.test(modelUrl));
}

/**
 * Create the female anime companion avatar.
 * Default: VRM anime girl → GLTF fallback → procedural → 2D.
 * @param {{
 *   canvas: HTMLCanvasElement,
 *   controlsElement?: HTMLElement | null,
 *   color?: string,
 *   modelUrl?: string,
 *   prefer?: 'vrm'|'gltf'|'auto',
 *   timeoutMs?: number,
 *   characterId?: string | null,
 *   onCharacterTap?: (info: { point?: unknown }) => void,
 *   onProgress?: (pct: number, label: string) => void,
 *   isAssistantSpeaking?: () => boolean,
 * }} opts
 */
export async function createCompanionAvatar(opts) {
  const emit = (pct, label) => opts.onProgress?.(pct, label);
  emit(4, "boot");
  const timeoutMs = resolveAvatarLoadTimeoutMs(
    opts.characterId,
    opts.timeoutMs,
  );
  const prefer = opts.prefer || "vrm";
  const modelUrl = opts.modelUrl || undefined;
  const characterId =
    opts.characterId ||
    resolveCharacterId({ modelUrl, avatarPrefer: prefer === "gltf" ? "gltf" : "vrm" });
  const rosterVrmUrl =
    modelUrl ||
    defaultVrmModelFetchUrl(characterId) ||
    defaultVrmModelFetchUrl("nova");
  let canvas = opts.canvas;
  const controlsElement = opts.controlsElement || null;
  const wantsGltf = prefer === "gltf";
  const wantsVrm =
    prefer === "vrm" ||
    prefer === "auto" ||
    Boolean(modelUrl && /\.vrm($|\?)/i.test(modelUrl));
  const skipGltfFallback = shouldSkipGltfFallback(modelUrl, prefer);

  if (wantsVrm && !wantsGltf) {
    try {
      const vrmModule =
        globalThis.__amojiPreload?.getVrmModule?.() ?? import("./vrmAvatar.js");
      const { createVrmAvatar } = await vrmModule;
      emit(8, "vrm");
      try {
        await preloadVrmBuffer(rosterVrmUrl);
      } catch (preloadErr) {
        console.warn("[companion] VRM prefetch failed, loading from URL", preloadErr);
      }
      const avatar = await withLoadTimeout(
        createVrmAvatar({
          canvas,
          controlsElement,
          modelUrl: rosterVrmUrl,
          characterId,
          onCharacterTap: opts.onCharacterTap,
          isAssistantSpeaking: opts.isAssistantSpeaking,
          onProgress: (ratio, label) => {
            emit(8 + Math.round(ratio * 78), label || "vrm");
          },
        }),
        timeoutMs,
        "vrm",
      );
      avatar.resize?.();
      const loadedUrl = avatar.getLoadedModelUrl?.();
      if (characterId && loadedUrl) {
        const { modelPathMatchesCharacterId } =
          await import("./companionModelAssets.mjs");
        if (!modelPathMatchesCharacterId(loadedUrl, characterId)) {
          throw new Error(
            `vrm-character-model-mismatch:${characterId}:${loadedUrl}`,
          );
        }
      }
      emit(96, "ready");
      return { avatar, kind: "vrm3d", canvas };
    } catch (err) {
      console.warn(
        skipGltfFallback
          ? "[companion] VRM avatar failed, skipping other-character GLB"
          : "[companion] VRM avatar failed, trying GLTF",
        err,
      );
      canvas = replaceAvatarCanvas(canvas);
    }
  }

  if (!skipGltfFallback && (wantsGltf || prefer === "auto")) {
    try {
      const gltfModule =
        globalThis.__amojiPreload?.ready?.gltfModule ?? import("./gltfAvatar.js");
      const { createGltfAvatar } = await gltfModule;
      emit(8, "gltf");
      const avatar = await withLoadTimeout(
        createGltfAvatar({
          canvas,
          controlsElement,
          characterId,
          modelUrl:
            modelUrl && /\.glb($|\?)/i.test(modelUrl)
              ? modelUrl
              : "/prototypes/assets/companion-girl.glb",
          onProgress: (ratio, label) => {
            emit(8 + Math.round(ratio * 78), label || "gltf");
          },
        }),
        timeoutMs,
        "gltf",
      );
      avatar.resize?.();
      emit(96, "ready");
      return { avatar, kind: "gltf3d", canvas };
    } catch (err) {
      console.warn("[companion] GLTF avatar failed, trying procedural", err);
      canvas = replaceAvatarCanvas(canvas);
    }
  }

  try {
    const { createLowPolyAvatar } = await import("./lowPolyAvatar.js");
    const avatar = createLowPolyAvatar({ ...opts, canvas });
    avatar.resize?.();
    return { avatar, kind: "webgl3d", canvas };
  } catch (err) {
    console.warn("[companion] WebGL avatar unavailable, using 2D fallback", err);
    canvas = replaceAvatarCanvas(canvas);
    const { createFallbackAvatar } = await import("./fallbackAvatar.js");
    return { avatar: createFallbackAvatar({ ...opts, canvas }), kind: "canvas2d", canvas };
  }
}
