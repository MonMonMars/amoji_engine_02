import { describe, expect, it, vi } from "vitest";
import {
  getRosterPreloadProgress,
  retainSelectedCharacterCache,
  startCharacterRosterPreload,
  uniqueCharacterModelUrls,
} from "../engine/companion/companionCharacterPreload.js";
import {
  getPreloadedVrmPromise,
  preloadVrmBuffer,
  releaseVrmPreloadExcept,
} from "../engine/companion/companionPreload.js";

describe("companionCharacterPreload", () => {
  it("lists unique model urls for the roster", () => {
    const urls = uniqueCharacterModelUrls("en");
    expect(urls.length).toBeGreaterThanOrEqual(2);
    expect(new Set(urls).size).toBe(urls.length);
  });

  it("preloads all roster models and reports progress", async () => {
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
    });

    expect(result.ok).toBe(true);
    expect(fetchImpl.mock.calls.length).toBeGreaterThanOrEqual(2);
    expect(getRosterPreloadProgress()).toBe(1);
    expect(progress.length).toBe(0);
  });

  it("releases unselected model caches after pick", async () => {
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
