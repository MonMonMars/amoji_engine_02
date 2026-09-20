import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { startAppUpdateWatcher } from "../engine/companion/companionFreshBoot.js";

const earlyBoot = readFileSync(
  join(
    dirname(fileURLToPath(import.meta.url)),
    "../engine/companion/companionEarlyFreshBoot.js",
  ),
  "utf8",
);

describe("companionEarlyFreshBoot", () => {
  it("does not purge caches on every tab focus (picker assets stay warm)", () => {
    expect(earlyBoot).not.toMatch(/visibilitychange/);
  });

  it("skips pathname redirects on default character-picker entry", () => {
    expect(earlyBoot).toMatch(/function isPickerEntry/);
    expect(earlyBoot).toMatch(/if \(isPickerEntry\(\)\)/);
  });

  it("does not force a new /n/ stamp on BFCache restore when build already matches", () => {
    expect(earlyBoot).toMatch(/addEventListener\("pageshow"/);
    expect(earlyBoot).toMatch(/ev\.persisted/);
    expect(earlyBoot).toMatch(/probeServerBuild\(false\)/);
    expect(earlyBoot).not.toMatch(/probeServerBuild\(true\)/);
    expect(earlyBoot).toMatch(/REDIRECT_GUARD|redirectGuardAllows/);
  });
});

describe("startAppUpdateWatcher", () => {
  it("listens for persisted pageshow so BFCache cannot keep a stale build", () => {
    const listeners = [];
    const originalAdd = globalThis.addEventListener;
    globalThis.addEventListener = (type, fn) => {
      listeners.push({ type, fn });
    };
    try {
      startAppUpdateWatcher({ intervalMs: 0, fetchImpl: async () => ({ ok: false }) });
      expect(listeners.some((row) => row.type === "pageshow")).toBe(true);
    } finally {
      if (originalAdd) globalThis.addEventListener = originalAdd;
      else delete globalThis.addEventListener;
    }
  });
});
