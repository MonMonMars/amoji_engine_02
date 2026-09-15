import { describe, expect, it, vi } from "vitest";
import {
  checkForAppUpdate,
  resolveCompanionModuleUrl,
  shouldReloadForBuild,
  versionedModuleUrl,
} from "../engine/companion/companionFreshBoot.js";

describe("companionFreshBoot", () => {
  it("detects build mismatch", () => {
    expect(shouldReloadForBuild("v1", "v2")).toBe(true);
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

  it("reloads when health build differs from page build", async () => {
    const reload = vi.fn();
    const fetchImpl = vi.fn(async () => ({
      ok: true,
      json: async () => ({ build: "server-new" }),
    }));
    globalThis.location = { reload };
    globalThis.__amojiBuild = "page-old";

    const result = await checkForAppUpdate("page-old", { fetchImpl });
    expect(result.reloaded).toBe(true);
    expect(reload).toHaveBeenCalled();
  });
});
