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
  it("does not fetch health or redirect (picker-stable boot)", () => {
    expect(earlyBoot).not.toMatch(/fetch\s*\(\s*["']\/api\/health/);
    expect(earlyBoot).not.toMatch(/location\.replace/);
    expect(earlyBoot).toMatch(/__amojiActiveBuild/);
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
