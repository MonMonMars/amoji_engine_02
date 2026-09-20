import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const html = readFileSync(join(root, "prototypes/amoji-companion.html"), "utf8");
const aaaCss = readFileSync(
  join(root, "prototypes/companion-picker-aaa-theme.css"),
  "utf8",
);
const titleCss = readFileSync(
  join(root, "prototypes/companion-title-screen.css"),
  "utf8",
);

describe("companionPickerAaaTheme", () => {
  it("links AAA picker theme stylesheet and art assets", () => {
    expect(html).toContain("companion-picker-aaa-theme.css");
    expect(html).toContain("companion-title-screen.css");
    expect(html).toContain("amoji-title-screen");
    expect(titleCss).toContain("/prototypes/assets/title-screen-anime-bg.png");
    expect(aaaCss).toContain("/prototypes/assets/picker-aaa-bg.png");
    expect(aaaCss).toMatch(/picker-hero-portrait[\s\S]*linear-gradient/);
    expect(aaaCss).toMatch(/picker-hero-portrait img[\s\S]*object-fit:\s*contain/);
    expect(aaaCss).toContain("/prototypes/assets/picker-roster-plate.png");
    expect(aaaCss).toMatch(/companion-picker--aaa-theme[\s\S]*picker-confirm-btn/);
    expect(aaaCss).toMatch(/companion-picker--session[\s\S]*picker-switch-btn/);
    expect(titleCss).toContain("title-screen-logo");
  });
});
