/**
 * Create the best available companion avatar:
 * high-poly GLTF Michelle → procedural high-poly → 2D fallback.
 * @param {{ canvas: HTMLCanvasElement, color?: string }} opts
 */
export async function createCompanionAvatar(opts) {
  // Prefer skinned GLTF girl + orbit controls
  try {
    const { createGltfAvatar } = await import("./gltfAvatar.js");
    const avatar = await createGltfAvatar(opts);
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
