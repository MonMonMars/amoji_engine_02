import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");

function readCss(name) {
  return readFileSync(join(root, "prototypes", name), "utf8");
}

describe("companion wide desktop layout", () => {
  it("keeps chat centered with fixed column and compacts session picker on min-width 1024px", () => {
    const css = readFileSync(join(root, "prototypes/companion-responsive-layout.css"), "utf8");
    expect(css).toContain("companion-wide-layout");
    expect(css).toContain("@media (min-width: 1024px)");
    expect(css).toMatch(
      /companion-wide-layout[\s\S]*--amoji-chat-column-width|var\(--amoji-chat-column-width\)/,
    );
    expect(css).toMatch(/translateX\(-50%\)/);
    expect(css).toMatch(/companion-picker--session[\s\S]*max-height:\s*min\(68vh,\s*520px\)/);
    expect(css).toContain("companion-start-picker-open");
  });

  it("hides ghost Menu overlays on wide desktop and during start picker", () => {
    const appWidth = readCss("companion-app-width.css");
    expect(appWidth).toMatch(/companion-wide-layout[\s\S]*\.settings:not\(\.open\)/);
    expect(appWidth).toContain("companion-start-picker-open.companion-wide-layout .settings");

    const startSheet = readCss("companion-start-picker-sheet.css");
    expect(startSheet).toMatch(/companion-start-picker-open[\s\S]*\.settings/);
    expect(startSheet).toMatch(/1024px[\s\S]*100vw/);
  });
});
