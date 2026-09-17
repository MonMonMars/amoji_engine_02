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
  it("purges Cache Storage on every open, not only after health succeeds", () => {
    const purgeIdx = earlyBoot.indexOf("function purgeCaches()");
    const immediateIdx = earlyBoot.indexOf("purgeCaches();\n  probeServerBuild();");
    const healthIdx = earlyBoot.indexOf('fetch("/api/health"');
    expect(purgeIdx).toBeGreaterThan(0);
    expect(immediateIdx).toBeGreaterThan(purgeIdx);
    expect(healthIdx).toBeGreaterThan(purgeIdx);
    expect(immediateIdx).toBeGreaterThan(healthIdx);
  });

  it("re-purges when iOS restores a BFCache page", () => {
    expect(earlyBoot).toMatch(/addEventListener\("pageshow"/);
    expect(earlyBoot).toMatch(/ev\.persisted/);
    expect(earlyBoot).toMatch(/visibilitychange/);
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
