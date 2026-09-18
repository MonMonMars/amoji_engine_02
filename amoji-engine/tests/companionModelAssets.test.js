import { describe, expect, it, vi } from "vitest";
import {
  characterModelFetchUrl,
  modelFetchUrl,
  normalizeModelCacheKey,
} from "../engine/companion/companionModelAssets.mjs";
import {
  getPreloadedVrmPromise,
  preloadVrmBuffer,
  releaseVrmPreloadExcept,
} from "../engine/companion/companionPreload.js";

describe("companionModelAssets", () => {
  it("normalizes cache keys without query string", () => {
    expect(normalizeModelCacheKey("/a/model.vrm?v=1")).toBe("/a/model.vrm");
    expect(normalizeModelCacheKey("/a/model.vrm")).toBe("/a/model.vrm");
  });

  it("adds build cache-bust to fetch urls", () => {
    const url = modelFetchUrl("/prototypes/assets/companion-nova.vrm", "test-build");
    expect(url).toContain("companion-nova.vrm");
    expect(url).toContain("v=test-build");
  });

  it("characterModelFetchUrl resolves roster paths", () => {
    const url = characterModelFetchUrl("chad", "en", "b1");
    expect(url).toContain("companion-chad.vrm");
    expect(url).toContain("v=b1");
  });
});

describe("companionPreload model cache keys", () => {
  it("releaseVrmPreloadExcept keeps canonical path when fetch url has query", async () => {
    const fetchImpl = vi.fn(async () => ({
      ok: true,
      async arrayBuffer() {
        return new Uint8Array([1, 2, 3]).buffer;
      },
    }));
    await preloadVrmBuffer(
      "/prototypes/assets/companion-nova.vrm?v=old",
      fetchImpl,
    );
    await preloadVrmBuffer(
      "/prototypes/assets/companion-chad.vrm?v=old",
      fetchImpl,
    );
    releaseVrmPreloadExcept("/prototypes/assets/companion-chad.vrm");
    expect(getPreloadedVrmPromise("/prototypes/assets/companion-chad.vrm?v=new")).toBeTruthy();
    expect(getPreloadedVrmPromise("/prototypes/assets/companion-nova.vrm")).toBeNull();
  });
});
