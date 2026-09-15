import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import {
  buildFreshBootUrl,
  checkForAppUpdate,
  isServerBuildNewer,
  parseBuildNumber,
  resolveCompanionModuleUrl,
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
    expect(nextUrl).toContain("build=2026-09-15-v69-demo-fresh");
    expect(nextUrl).toContain("_cb=");
  });

  it("does not reload when page build is newer than server", async () => {
    const replace = vi.fn();
    const fetchImpl = vi.fn(async () => ({
      ok: true,
      json: async () => ({ build: "2026-09-14-v39-body-rig-actions" }),
    }));
    globalThis.location = { href: "https://example.com/companion-full", replace };
    globalThis.__amojiBuild = "2026-09-15-v69-demo-fresh";

    const result = await checkForAppUpdate("2026-09-15-v69-demo-fresh", {
      fetchImpl,
    });
    expect(result.reloaded).toBe(false);
    expect(replace).not.toHaveBeenCalled();
  });

  it("buildFreshBootUrl adds build and cache-bust query params", () => {
    globalThis.location = {
      href: "https://example.com/companion-full?lang=yue",
    };
    const url = buildFreshBootUrl("2026-09-15-v69-demo-fresh");
    expect(url).toContain("lang=yue");
    expect(url).toContain("build=2026-09-15-v69-demo-fresh");
    expect(url).toContain("_cb=");
  });
});
