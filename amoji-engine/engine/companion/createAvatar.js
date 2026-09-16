import { isIosLike } from "./companionPlatform.js";

export const COMPANION_AVATAR_SCHEMA = "amoji.createAvatar.v1";

/** Per-stage timeout so slow mobile networks do not block the whole page. */
export const AVATAR_LOAD_TIMEOUT_MS = 22_000;

/**
 * Replace canvas so a failed WebGL context does not block the next renderer.
 * @param {HTMLCanvasElement} canvas
 * @returns {HTMLCanvasElement}
 */
export function replaceAvatarCanvas(canvas) {
  const parent = canvas?.parentNode;
  if (!parent) return canvas;
  const fresh = canvas.cloneNode(false);
  fresh.id = canvas.id;
  fresh.className = canvas.className;
  const aria = canvas.getAttribute("aria-label");
  if (aria) fresh.setAttribute("aria-label", aria);
  parent.replaceChild(fresh, canvas);
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
    setTalkEnergy: noop,
    setTalkStyle: noop,
    reactToTap: noop,
    reactToSpeechChunk: noop,
    playGestureForText: noop,
    playAction: noop,
    playActionSequence: noop,
    stopAction: noop,
    applyContentFromReply: () => ({ emotion: "neutral", talkStyle: "explain" }),
    setThinking: noop,
    applyStreamingContent: () => ({ emotion: "thinking", talkStyle: "thinking" }),
    prepareThinkingFromUser: () => ({ emotion: "thinking", talkStyle: "thinking" }),
  };
}

/**
 * @template T
 * @param {Promise<T>} promise
 * @param {number} ms
 * @param {string} [label]
 * @returns {Promise<T>}
 */
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

/**
 * Create the female anime companion avatar.
 * Default: VRM anime girl → GLTF fallback → procedural → 2D.
 * @param {{
 *   canvas: HTMLCanvasElement,
 *   color?: string,
 *   modelUrl?: string,
 *   prefer?: 'vrm'|'gltf'|'auto',
 *   timeoutMs?: number,
 *   onCharacterTap?: (info: { point?: unknown }) => void,
 *   onProgress?: (pct: number, label: string) => void,
 * }} opts
 */
export async function createCompanionAvatar(opts) {
  const emit = (pct, label) => opts.onProgress?.(pct, label);
  emit(4, "boot");
  const timeoutMs =
    opts.timeoutMs ??
    (isIosLike() ? 45_000 : AVATAR_LOAD_TIMEOUT_MS);
  const prefer = opts.prefer || "vrm";
  const modelUrl = opts.modelUrl || undefined;
  let canvas = opts.canvas;
  const wantsGltf = prefer === "gltf";
  const wantsVrm =
    prefer === "vrm" ||
    prefer === "auto" ||
    Boolean(modelUrl && /\.vrm($|\?)/i.test(modelUrl));

  if (wantsVrm && !wantsGltf) {
    try {
      const vrmModule =
        globalThis.__amojiPreload?.getVrmModule?.() ?? import("./vrmAvatar.js");
      const { createVrmAvatar } = await vrmModule;
      emit(8, "vrm");
      const avatar = await withLoadTimeout(
        createVrmAvatar({
          canvas,
          modelUrl: modelUrl || "/prototypes/assets/companion-girl.vrm",
          onCharacterTap: opts.onCharacterTap,
          onProgress: (ratio, label) => {
            emit(8 + Math.round(ratio * 78), label || "vrm");
          },
        }),
        timeoutMs,
        "vrm",
      );
      avatar.resize?.();
      emit(96, "ready");
      return { avatar, kind: "vrm3d", canvas };
    } catch (err) {
      console.warn("[companion] VRM avatar failed, trying GLTF", err);
      canvas = replaceAvatarCanvas(canvas);
    }
  }

  if (wantsGltf || prefer === "auto") {
    try {
      const gltfModule =
        globalThis.__amojiPreload?.ready?.gltfModule ?? import("./gltfAvatar.js");
      const { createGltfAvatar } = await gltfModule;
      emit(8, "gltf");
      const avatar = await withLoadTimeout(
        createGltfAvatar({
          canvas,
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
