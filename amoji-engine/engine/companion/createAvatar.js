/**
 * Create the best available companion avatar (WebGL low-poly → 2D fallback).
 * @param {{ canvas: HTMLCanvasElement, color?: string }} opts
 */
export async function createCompanionAvatar(opts) {
  try {
    const { createLowPolyAvatar } = await import("./lowPolyAvatar.js");
    const avatar = createLowPolyAvatar(opts);
    // Force a render probe — some environments construct then fail on first frame.
    avatar.resize?.();
    return { avatar, kind: "webgl3d" };
  } catch (err) {
    console.warn("[companion] WebGL avatar unavailable, using 2D fallback", err);
    const { createFallbackAvatar } = await import("./fallbackAvatar.js");
    return { avatar: createFallbackAvatar(opts), kind: "canvas2d" };
  }
}
