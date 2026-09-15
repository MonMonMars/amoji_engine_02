import { describe, expect, it, vi } from "vitest";
import {
  checkForAppUpdate,
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
