/**
 * Create the best available companion avatar:
 * VRM anime girl → GLTF Michelle → procedural high-poly → 2D fallback.
 * @param {{ canvas: HTMLCanvasElement, color?: string, modelUrl?: string, prefer?: 'vrm'|'gltf'|'auto' }} opts
 */
export async function createCompanionAvatar(opts) {
  const prefer = opts.prefer || "auto";
  const modelUrl =
    opts.modelUrl ||
    (prefer === "gltf" ? "/prototypes/assets/companion-girl.glb" : undefined);

  // Prefer VRM girl (expressions, spring bones, MToon)
  if (prefer !== "gltf") {
    try {
      const { createVrmAvatar } = await import("./vrmAvatar.js");
      const avatar = await createVrmAvatar({
        canvas: opts.canvas,
        modelUrl: modelUrl || "/prototypes/assets/companion-girl.vrm",
      });
      avatar.resize?.();
      return { avatar, kind: "vrm3d" };
    } catch (err) {
      console.warn("[companion] VRM avatar failed, trying GLTF", err);
    }
  }

  // Skinned GLTF girl + orbit controls
  try {
    const { createGltfAvatar } = await import("./gltfAvatar.js");
    const avatar = await createGltfAvatar({
      canvas: opts.canvas,
      modelUrl: modelUrl || "/prototypes/assets/companion-girl.glb",
    });
    avatar.resize?.();
    return { avatar, kind: "gltf3d" };
  } catch (err) {
    console.warn("[companion] GLTF avatar failed, trying procedural", err);
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
