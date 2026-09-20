import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const html = readFileSync(join(root, "prototypes/amoji-companion.html"), "utf8");
const v4Css = readFileSync(join(root, "prototypes/companion-picker-v4.css"), "utf8");
const stackedCss = readFileSync(
  join(root, "prototypes/companion-picker-stacked-layout.css"),
  "utf8",
);

describe("companionPickerRosterLayout", () => {
  it("keeps roster strip as fixed-width horizontal scroll on short viewports", () => {
    expect(html).not.toMatch(
      /max-height:\s*620px[\s\S]*companion-picker-grid--roster[\s\S]*repeat\(4,\s*minmax\(0,\s*1fr\)\)/,
    );
    expect(v4Css).not.toMatch(
      /max-height:\s*620px[\s\S]*companion-picker-grid--roster[\s\S]*repeat\(4,\s*minmax\(4\.35rem,\s*1fr\)\)/,
    );
    expect(html).toMatch(/grid-auto-columns:\s*minmax\(3\.85rem,\s*4\.25rem\)/);
  });

  it("reserves a dedicated background row in stacked start picker", () => {
    expect(stackedCss).toMatch(/\.picker-background-row[\s\S]*z-index:\s*6/);
    expect(stackedCss).toMatch(/companion-card-portrait[\s\S]*max-height:\s*3\.15rem/);
  });
});
