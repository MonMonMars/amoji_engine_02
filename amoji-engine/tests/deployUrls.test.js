import { describe, expect, it } from "vitest";
import {
  companionFullDemoUrl,
  companionLiteDemoUrl,
  DEMO_BASE_URL,
  formatDemoLinkBlock,
  secretaryDemoUrl,
} from "../engine/companion/deployUrls.mjs";

describe("deployUrls", () => {
  it("builds full companion demo URLs", () => {
    const url = companionFullDemoUrl({ lang: "yue", build: "test-build" });
    expect(url).toContain(DEMO_BASE_URL);
    expect(url).toContain("lang=yue");
    expect(url).toContain("build=test-build");
    expect(url).toContain("pick=1");
    expect(url).toContain("automic=0");
  });

  it("formats demo link block for agents", () => {
    const block = formatDemoLinkBlock({ build: "test-build" });
    expect(block).toContain("test-build");
    expect(block).toContain("/c/test-build/full");
    expect(block).toContain("/c/test-build/lite");
    expect(block).toContain("Secretary");
  });

  it("builds secretary demo URL with today tab", () => {
    const url = secretaryDemoUrl({ build: "test-build", lang: "yue" });
    expect(url).toContain("tab=today");
    expect(url).toContain("build=test-build");
  });
});
