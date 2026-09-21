import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const cssPath = join(
  dirname(fileURLToPath(import.meta.url)),
  "../../prototypes/companion-responsive-layout.css",
);

describe("companion wide desktop layout", () => {
  it("keeps chat centered with fixed column and compacts picker on min-width 1024px", () => {
    const css = readFileSync(cssPath, "utf8");
    expect(css).toContain("companion-wide-layout");
    expect(css).toContain("@media (min-width: 1024px)");
    expect(css).toMatch(
      /companion-wide-layout[\s\S]*--amoji-chat-column-width|var\(--amoji-chat-column-width\)/,
    );
    expect(css).toMatch(/translateX\(-50%\)/);
    expect(css).toMatch(/max-height:\s*min\(68vh,\s*520px\)/);
  });
});
