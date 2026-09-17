import { describe, expect, it } from "vitest";
import {
  companionFullDemoUrl,
  companionFullDirectUrl,
  companionLiteDemoUrl,
  companionLiteDirectUrl,
  DEMO_BASE_URL,
  formatDemoLinkBlock,
  secretaryDemoUrl,
} from "../engine/companion/deployUrls.mjs";

describe("deployUrls", () => {
  it("builds full companion demo URLs", () => {
    const url = companionFullDemoUrl({ lang: "yue", build: "test-build" });
    expect(url).toContain(DEMO_BASE_URL);
    expect(url).toContain("/play");
    expect(url).toContain("lang=yue");
    expect(url).toContain("pick=1");
    expect(url).toContain("automic=0");
  });

  it("formats demo link block for agents", () => {
    const block = formatDemoLinkBlock({ build: "test-build" });
    expect(block).toContain("test-build");
    expect(block).toContain("/play");
    expect(block).toContain("companion-full");
    expect(block).toContain("Secretary");
  });

  it("builds direct companion URLs for stale production hosts", () => {
    const full = companionFullDirectUrl({ lang: "en", build: "test-build" });
    expect(full).toContain("/companion-full");
    expect(full).toContain("lang=en");
    expect(full).toContain("build=test-build");
    const lite = companionLiteDirectUrl({ lang: "yue", build: "test-build" });
    expect(lite).toContain("/companion?");
    expect(lite).toContain("lang=yue");
  });

  it("builds secretary demo URL with today tab", () => {
    const url = secretaryDemoUrl({ build: "test-build", lang: "yue" });
    expect(url).toContain("tab=today");
    expect(url).toContain("/play");
    expect(url).toContain("kind=lite");
  });
});
