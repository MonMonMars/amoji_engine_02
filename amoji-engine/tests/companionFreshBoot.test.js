import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import {
  buildFreshBootUrl,
  buildPlayFallbackLocation,
  buildPlayRedirectLocation,
  resolvePlayEntryLocation,
  checkForAppUpdate,
  companionBuildPath,
  companionFallbackPath,
  companionKindFromPath,
  companionOpenPath,
  isCompanionOpenPath,
  isStickyCompanionBookmark,
  isServerBuildNewer,
  parseBuildNumber,
  pathHasBuild,
  pathSatisfiesBuild,
  resolveCompanionBootPath,
  resolveCompanionModuleUrl,
  rewriteCompanionServePath,
  shouldReloadForBuild,
  versionedModuleUrl,
} from "../engine/companion/companionFreshBoot.js";

describe("companionFreshBoot", () => {
  beforeEach(() => {
    vi.stubGlobal("sessionStorage", {
      _data: {},
      getItem(key) {
        return this._data[key] ?? null;
      },
      setItem(key, value) {
        this._data[key] = String(value);
      },
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("parses v-number from build ids", () => {
    expect(parseBuildNumber("2026-09-15-v68-spring-stability")).toBe(68);
    expect(parseBuildNumber("legacy")).toBe(0);
  });

  it("detects when server build is newer", () => {
    expect(
      isServerBuildNewer(
        "2026-09-14-v39-body-rig-actions",
        "2026-09-15-v69-demo-fresh",
      ),
    ).toBe(true);
    expect(
      isServerBuildNewer(
        "2026-09-15-v69-demo-fresh",
        "2026-09-14-v39-body-rig-actions",
      ),
    ).toBe(false);
    expect(shouldReloadForBuild("v1", "v1")).toBe(false);
    expect(shouldReloadForBuild("", "v2")).toBe(false);
  });

  it("appends cache-bust query to module urls", () => {
    expect(versionedModuleUrl("/foo.js", "build-1")).toBe(
      "/foo.js?v=build-1",
    );
    expect(versionedModuleUrl("/foo.js?x=1", "b")).toBe("/foo.js?x=1&v=b");
  });

  it("resolves HTML-relative ami paths against the page URL", () => {
    globalThis.document = {
      baseURI: "https://example.com/prototypes/amoji-companion.html",
    };
    const url = resolveCompanionModuleUrl(
      "../amoji-engine/engine/companion/createAvatar.js",
      "build-1",
    );
    expect(url).toBe(
      "https://example.com/amoji-engine/engine/companion/createAvatar.js?v=build-1",
    );
    expect(url).not.toContain("/amoji-engine/engine/amoji-engine/");
  });

  it("resolves companion-full page paths without doubling amoji-engine", () => {
    globalThis.document = {
      baseURI: "https://example.com/companion-full",
    };
    const spec = resolveCompanionModuleUrl(
      "../amoji-engine/engine/companion/createAvatar.js",
      "build-1",
    );
    expect(spec).toBe(
      "https://example.com/amoji-engine/engine/companion/createAvatar.js?v=build-1",
    );
    expect(spec).not.toContain("/amoji-engine/engine/amoji-engine/");
  });

  it("redirects with cache-bust params when health build is newer", async () => {
    const replace = vi.fn();
    const fetchImpl = vi.fn(async () => ({
      ok: true,
      json: async () => ({ build: "2026-09-15-v69-demo-fresh" }),
    }));
    globalThis.location = {
      href: "https://example.com/companion-full?lang=yue",
      replace,
    };
    globalThis.__amojiBuild = "2026-09-14-v39-body-rig-actions";

    const result = await checkForAppUpdate("2026-09-14-v39-body-rig-actions", {
      fetchImpl,
    });
    expect(result.reloaded).toBe(true);
    expect(replace).toHaveBeenCalledTimes(1);
    const nextUrl = replace.mock.calls[0][0];
    expect(nextUrl).toMatch(/\/n\/\d+\/full/);
    expect(nextUrl).toContain("build=2026-09-15-v69-demo-fresh");
    expect(nextUrl).toContain("_cb=");
  });

  it("does not reload when page build is newer and already on unique path", async () => {
    const replace = vi.fn();
    const fetchImpl = vi.fn(async () => ({
      ok: true,
      json: async () => ({ build: "2026-09-14-v39-body-rig-actions" }),
    }));
    globalThis.location = {
      href: "https://example.com/c/2026-09-14-v39-body-rig-actions/full",
      pathname: "/c/2026-09-14-v39-body-rig-actions/full",
      replace,
    };
    globalThis.__amojiBuild = "2026-09-15-v69-demo-fresh";

    const result = await checkForAppUpdate("2026-09-15-v69-demo-fresh", {
      fetchImpl,
    });
    expect(result.reloaded).toBe(false);
    expect(replace).not.toHaveBeenCalled();
  });

  it("moves /companion-full onto a per-open /n/<stamp>/ path even when builds match", async () => {
    const replace = vi.fn();
    const fetchImpl = vi.fn(async () => ({
      ok: true,
      json: async () => ({ build: "2026-09-17-v153-repeat-issues" }),
    }));
    globalThis.location = {
      href: "https://example.com/companion-full?lang=yue",
      pathname: "/companion-full",
      replace,
    };
    globalThis.__amojiBuild = "2026-09-17-v153-repeat-issues";

    const result = await checkForAppUpdate("2026-09-17-v153-repeat-issues", {
      fetchImpl,
    });
    expect(result.reloaded).toBe(true);
    expect(replace.mock.calls[0][0]).toMatch(/\/n\/\d+\/full/);
  });

  it("buildPlayFallbackLocation targets /companion-full with cache bust", () => {
    const url = buildPlayFallbackLocation("?lang=en&pick=1", {
      build: "2026-09-17-v171-play-entry-fix",
      stamp: "1234567890",
    });
    expect(url).toContain("/companion-full?");
    expect(url).toContain("lang=en");
    expect(url).toContain("build=2026-09-17-v171-play-entry-fix");
    expect(url).toContain("_cb=1234567890");
  });

  it("resolvePlayEntryLocation falls back when /play is missing", async () => {
    const fetchImpl = vi.fn(async (url, init) => {
      if (String(url).endsWith("/play")) {
        return { status: 404, ok: false };
      }
      return { status: 404, ok: false };
    });
    const resolved = await resolvePlayEntryLocation("?lang=en", {
      build: "b1",
      origin: "https://example.com",
      fetchImpl,
    });
    expect(resolved).toContain("https://example.com/companion-full");
    expect(resolved).toContain("lang=en");
  });

  it("buildFreshBootUrl uses a per-open /n/<stamp>/ path", () => {
    globalThis.location = {
      href: "https://example.com/companion-full?lang=yue",
    };
    const url = buildFreshBootUrl("2026-09-15-v69-demo-fresh");
    expect(url).toMatch(/\/n\/\d+\/full/);
    expect(url).toContain("lang=yue");
    expect(url).toContain("build=2026-09-15-v69-demo-fresh");
    expect(url).toContain("_cb=");
  });

  it("rewrites unique companion paths onto prototype HTML files", () => {
    expect(rewriteCompanionServePath("/c/2026-09-17-v153-repeat-issues/full")).toBe(
      "/prototypes/amoji-companion.html",
    );
    expect(rewriteCompanionServePath("/n/1726550000/full")).toBe(
      "/prototypes/amoji-companion.html",
    );
    expect(rewriteCompanionServePath("/n/1726550000/lite")).toBe(
      "/prototypes/amoji-lite.html",
    );
    expect(rewriteCompanionServePath("/c/2026-09-17-v153-repeat-issues/lite")).toBe(
      "/prototypes/amoji-lite.html",
    );
    expect(rewriteCompanionServePath("/companion-full")).toBe(
      "/prototypes/amoji-companion.html",
    );
    expect(companionBuildPath("a b", "lite")).toBe("/c/a%20b/lite");
    expect(companionKindFromPath("/c/x/lite")).toBe("lite");
    expect(pathHasBuild("/c/x/full", "x")).toBe(true);
  });

  it("resolves unique /c/<build>/ page paths onto /amoji-engine modules", () => {
    globalThis.document = {
      baseURI: "https://example.com/c/2026-09-17-v153-repeat-issues/full",
    };
    const spec = resolveCompanionModuleUrl(
      "../amoji-engine/engine/companion/createAvatar.js",
      "build-1",
    );
    expect(spec).toBe(
      "https://example.com/amoji-engine/engine/companion/createAvatar.js?v=build-1",
    );
    expect(spec).not.toContain("/c/2026-09-17-v153-repeat-issues/amoji-engine");
  });

  it("falls back to /companion-full when unique /n/ and /c/ paths are missing", async () => {
    expect(companionFallbackPath("full")).toBe("/companion-full");
    expect(pathSatisfiesBuild("/companion-full", "v154", "?build=v154")).toBe(true);
    expect(pathSatisfiesBuild("/n/99/full", "v154", "?build=v154")).toBe(true);
    expect(pathSatisfiesBuild("/companion-full", "v154", "")).toBe(false);
    const fetchImpl = vi.fn(async (url) => {
      if (String(url).includes("/n/") || String(url).includes("/c/")) {
        return { ok: false, status: 404 };
      }
      return { ok: true, json: async () => ({ build: "v154" }) };
    });
    const path = await resolveCompanionBootPath("v154", "full", { fetchImpl });
    expect(path).toBe("/companion-full");
  });

  it("does not loop when unique /c/ 404s and the fallback already has ?build=", async () => {
    const replace = vi.fn();
    const fetchImpl = vi.fn(async (url) => {
      if (String(url).includes("/api/health")) {
        return {
          ok: true,
          json: async () => ({ build: "2026-09-17-v154-repeat-all" }),
        };
      }
      return { ok: false, status: 404 };
    });
    globalThis.location = {
      href: "https://example.com/companion-full?lang=yue&build=2026-09-17-v154-repeat-all",
      pathname: "/companion-full",
      search: "?lang=yue&build=2026-09-17-v154-repeat-all",
      replace,
    };
    globalThis.__amojiBuild = "2026-09-17-v154-repeat-all";
    const result = await checkForAppUpdate("2026-09-17-v154-repeat-all", {
      fetchImpl,
    });
    expect(result.reloaded).toBe(false);
    expect(replace).not.toHaveBeenCalled();
  });

  it("mints a /play redirect onto a new /n/<stamp> path", () => {
    const loc = buildPlayRedirectLocation("?lang=en&pick=1", {
      build: "v159",
      stamp: 1726550000123,
    });
    expect(loc).toBe(
      "/n/1726550000123/full?lang=en&pick=1&build=v159&_cb=1726550000123",
    );
    expect(companionOpenPath("lite", 99)).toBe("/n/99/lite");
    expect(isCompanionOpenPath("/n/99/full")).toBe(true);
    expect(isStickyCompanionBookmark("/companion-full")).toBe(true);
    const a = buildPlayRedirectLocation("?lang=yue", { build: "v159", stamp: 1 });
    const b = buildPlayRedirectLocation("?lang=yue", { build: "v159", stamp: 2 });
    expect(a).not.toBe(b);
    expect(a).toContain("/n/1/full");
    expect(b).toContain("/n/2/full");
  });

  it("keeps an existing per-open path instead of minting another stamp", async () => {
    const fetchImpl = vi.fn(async () => ({ ok: true }));
    const path = await resolveCompanionBootPath("v159", "full", {
      fetchImpl,
      currentPath: "/n/111/full",
    });
    expect(path).toBe("/n/111/full");
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("resolves per-open /n/<stamp>/ page paths onto /amoji-engine modules", () => {
    globalThis.document = {
      baseURI: "https://example.com/n/1726550000/full",
    };
    const spec = resolveCompanionModuleUrl(
      "../amoji-engine/engine/companion/createAvatar.js",
      "build-1",
    );
    expect(spec).toBe(
      "https://example.com/amoji-engine/engine/companion/createAvatar.js?v=build-1",
    );
    expect(spec).not.toContain("/n/1726550000/amoji-engine");
  });
});
