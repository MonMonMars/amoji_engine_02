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

describe("companionPickerAaaTheme", () => {
  it("links AAA picker theme stylesheet and art assets", () => {
    expect(html).toContain("companion-picker-aaa-theme.css");
    expect(aaaCss).toContain("/prototypes/assets/picker-aaa-bg.png");
    expect(aaaCss).toContain("/prototypes/assets/picker-hero-frame.png");
    expect(aaaCss).toContain("/prototypes/assets/picker-roster-plate.png");
    expect(aaaCss).toMatch(/companion-picker--aaa-theme[\s\S]*picker-confirm-btn/);
  });
});
