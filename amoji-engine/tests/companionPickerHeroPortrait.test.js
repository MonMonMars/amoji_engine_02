import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "../../prototypes");

describe("picker hero portrait (no crop)", () => {
  it("v4 hero images use object-fit contain, not cover", () => {
    const v4 = readFileSync(join(root, "companion-picker-v4.css"), "utf8");
    expect(v4).toMatch(/\.picker-hero-portrait img[\s\S]*object-fit:\s*contain/i);
    expect(v4).not.toMatch(/\.picker-hero-portrait img[\s\S]*object-fit:\s*cover/i);
  });

  it("start stacked showcase stage does not clip hero with overflow hidden", () => {
    const stacked = readFileSync(join(root, "companion-picker-stacked-layout.css"), "utf8");
    expect(stacked).toMatch(
      /companion-picker--stacked-layout\.companion-picker--start \.picker-showcase-stage[\s\S]*overflow:\s*visible/,
    );
  });
});
