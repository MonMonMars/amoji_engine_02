export const COMPANION_AVATAR_SCHEMA = "amoji.createAvatar.v1";

/** Per-stage timeout so slow mobile networks do not block the whole page. */
export const AVATAR_LOAD_TIMEOUT_MS = 22_000;

/**
 * No-op avatar used while the real 3D model loads — keeps chat/voice alive.
 */
export function createStubAvatar() {
  const noop = () => {};
  return {
    resize: noop,
    setEmotion: noop,
    setMouthOpen: noop,
    setMouthShape: noop,
    setTalking: noop,
    setTalkEnergy: noop,
    setTalkStyle: noop,
    reactToTap: noop,
    reactToSpeechChunk: noop,
    playGestureForText: noop,
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
 * }} opts
 */
export async function createCompanionAvatar(opts) {
  const timeoutMs = opts.timeoutMs ?? AVATAR_LOAD_TIMEOUT_MS;
  const prefer = opts.prefer || "vrm";
  const modelUrl = opts.modelUrl || undefined;
  const wantsGltf = prefer === "gltf";
  const wantsVrm =
    prefer === "vrm" ||
    prefer === "auto" ||
    Boolean(modelUrl && /\.vrm($|\?)/i.test(modelUrl));

  if (wantsVrm && !wantsGltf) {
    try {
      const { createVrmAvatar } = await import("./vrmAvatar.js");
      const avatar = await withLoadTimeout(
        createVrmAvatar({
          canvas: opts.canvas,
          modelUrl: modelUrl || "/prototypes/assets/companion-girl.vrm",
          onCharacterTap: opts.onCharacterTap,
        }),
        timeoutMs,
        "vrm",
      );
      avatar.resize?.();
      return { avatar, kind: "vrm3d" };
    } catch (err) {
      console.warn("[companion] VRM avatar failed, trying GLTF", err);
    }
  }

  if (wantsGltf || prefer === "auto") {
    try {
      const { createGltfAvatar } = await import("./gltfAvatar.js");
      const avatar = await withLoadTimeout(
        createGltfAvatar({
          canvas: opts.canvas,
          modelUrl:
            modelUrl && /\.glb($|\?)/i.test(modelUrl)
              ? modelUrl
              : "/prototypes/assets/companion-girl.glb",
        }),
        timeoutMs,
        "gltf",
      );
      avatar.resize?.();
      return { avatar, kind: "gltf3d" };
    } catch (err) {
      console.warn("[companion] GLTF avatar failed, trying procedural", err);
    }
  }

  try {
    const { createLowPolyAvatar } = await import("./lowPolyAvatar.js");
    const avatar = createLowPolyAvatar(opts);
    avatar.resize?.();
    return { avatar, kind: "webgl3d" };
  } catch (err) {
    console.warn("[companion] WebGL avatar unavailable, using 2D fallback", err);
    const { createFallbackAvatar } = await import("./fallbackAvatar.js");
    return { avatar: createFallbackAvatar(opts), kind: "canvas2d" };
  }
}
