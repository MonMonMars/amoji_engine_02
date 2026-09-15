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
  });

  it("formats demo link block for agents", () => {
    const block = formatDemoLinkBlock({ build: "test-build" });
    expect(block).toContain("test-build");
    expect(block).toContain("companion-full");
    expect(block).toContain("companion");
    expect(block).toContain("Secretary");
  });

  it("builds secretary demo URL with today tab", () => {
    const url = secretaryDemoUrl({ build: "test-build", lang: "yue" });
    expect(url).toContain("tab=today");
    expect(url).toContain("build=test-build");
  });
});
