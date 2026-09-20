import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const html = readFileSync(join(root, "prototypes/amoji-companion.html"), "utf8");
const shellCss = readFileSync(
  join(root, "prototypes/companion-jp-aaa-shell.css"),
  "utf8",
);
const aaaCss = readFileSync(
  join(root, "prototypes/companion-picker-aaa-theme.css"),
  "utf8",
);

describe("companionJpAaaShell", () => {
  it("links JP AAA shell stylesheet and body hook class", () => {
    expect(html).toContain("companion-jp-aaa-shell.css");
    expect(html).toContain("companion-jp-aaa-ui");
    expect(shellCss).toMatch(/companion-jp-aaa-ui[\s\S]*\.settings-page-title/);
    expect(shellCss).toMatch(/starter-chip[\s\S]*::before/);
    expect(shellCss).toMatch(/\.composer[\s\S]*repeating-linear-gradient/);
    expect(aaaCss).toContain("picker-aaa-select-slash");
  });
});
