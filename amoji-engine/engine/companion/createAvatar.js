/**
 * Create the female anime companion avatar.
 * Default: VRM anime girl → GLTF fallback → procedural → 2D.
 * @param {{
 *   canvas: HTMLCanvasElement,
 *   color?: string,
 *   modelUrl?: string,
 *   prefer?: 'vrm'|'gltf'|'auto',
 *   onCharacterTap?: (info: { point?: unknown }) => void,
 * }} opts
 */
export async function createCompanionAvatar(opts) {
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
      const avatar = await createVrmAvatar({
        canvas: opts.canvas,
        modelUrl: modelUrl || "/prototypes/assets/companion-girl.vrm",
        onCharacterTap: opts.onCharacterTap,
      });
      avatar.resize?.();
      return { avatar, kind: "vrm3d" };
    } catch (err) {
      console.warn("[companion] VRM avatar failed, trying GLTF", err);
    }
  }

  if (wantsGltf || prefer === "auto") {
    try {
      const { createGltfAvatar } = await import("./gltfAvatar.js");
      const avatar = await createGltfAvatar({
        canvas: opts.canvas,
        modelUrl:
          modelUrl && /\.glb($|\?)/i.test(modelUrl)
            ? modelUrl
            : "/prototypes/assets/companion-girl.glb",
      });
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
