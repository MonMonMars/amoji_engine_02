import { describe, expect, it, vi } from "vitest";
import {
  getRosterPreloadProgress,
  injectRosterAssetHints,
  retainSelectedCharacterCache,
  startCharacterRosterPreload,
  uniqueCharacterModelUrls,
  uniqueCharacterPreviewUrls,
} from "../engine/companion/companionCharacterPreload.js";
import {
  getPreloadedVrmPromise,
  preloadVrmBuffer,
  releaseVrmPreloadExcept,
} from "../engine/companion/companionPreload.js";
import { sortModelUrlsForPreload } from "../engine/companion/companionVrmInspect.js";

describe("companionCharacterPreload", () => {
  it("lists unique VRM + GLB model urls for the full roster", () => {
    const urls = uniqueCharacterModelUrls("en");
    expect(urls.length).toBeGreaterThanOrEqual(16);
    expect(new Set(urls).size).toBe(urls.length);
    expect(urls.every((u) => /\.(vrm|glb)($|\?)/i.test(u))).toBe(true);
    expect(urls.some((u) => u.includes("companion-quinn"))).toBe(true);
    expect(urls.some((u) => u.includes("companion-girl.glb"))).toBe(true);
  });

  it("preloads Kizuna high-poly model before other roster VRMs", () => {
    const urls = sortModelUrlsForPreload(uniqueCharacterModelUrls("en"));
    expect(urls[0]).toContain("kizuna-kamatte.vrm");
  });

  it("preloads preview images and models together", async () => {
    const fetchImpl = vi.fn(async (url) => ({
      ok: true,
      async arrayBuffer() {
        return new TextEncoder().encode(`model:${url}`).buffer;
      },
    }));
    const progress = [];
    const result = await startCharacterRosterPreload({
      langCode: "en",
      fetchImpl,
      onProgress: (ratio) => progress.push(ratio),
    });
    expect(result.ok).toBe(true);
    expect(result.phase).toBe("background");
    expect(uniqueCharacterPreviewUrls("en").length).toBeGreaterThanOrEqual(18);
    expect(progress.length).toBeGreaterThan(0);
    const modelResult = await result.modelsLoading;
    expect(modelResult.ok).toBe(true);
    expect(getRosterPreloadProgress()).toBe(1);
    expect(progress[progress.length - 1]).toBe(1);
  });

  it("injects prefetch hints for roster assets", () => {
    if (typeof document === "undefined") return;
    document.head.innerHTML = "";
    injectRosterAssetHints("en");
    const hints = document.querySelectorAll("link[data-amoji-roster-hint]");
    expect(hints.length).toBeGreaterThanOrEqual(
      uniqueCharacterModelUrls("en").length +
        uniqueCharacterPreviewUrls("en").length,
    );
  });

  it("releases unselected model caches after pick", async () => {
    releaseVrmPreloadExcept(null);
    const fetchImpl = vi.fn(async (url) => ({
      ok: true,
      async arrayBuffer() {
        return new TextEncoder().encode(`model:${url}`).buffer;
      },
    }));

    const urls = uniqueCharacterModelUrls("en");
    await preloadVrmBuffer(urls[0], fetchImpl);
    if (urls[1]) await preloadVrmBuffer(urls[1], fetchImpl);

    expect(getPreloadedVrmPromise(urls[0])).toBeTruthy();
    if (urls[1]) expect(getPreloadedVrmPromise(urls[1])).toBeTruthy();

    retainSelectedCharacterCache(urls[0]);
    expect(getPreloadedVrmPromise(urls[0])).toBeTruthy();
    if (urls[1]) expect(getPreloadedVrmPromise(urls[1])).toBeNull();

    releaseVrmPreloadExcept(null);
  });
});
