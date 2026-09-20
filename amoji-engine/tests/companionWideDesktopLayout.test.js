import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const cssPath = join(
  dirname(fileURLToPath(import.meta.url)),
  "../../prototypes/companion-responsive-layout.css",
);

describe("companion wide desktop layout", () => {
  it("docks chat and compacts picker on min-width 1024px", () => {
    const css = readFileSync(cssPath, "utf8");
    expect(css).toContain("companion-wide-layout");
    expect(css).toContain("@media (min-width: 1024px)");
    expect(css).toMatch(/right:\s*max\(1rem/);
    expect(css).toMatch(/max-height:\s*min\(68vh,\s*520px\)/);
  });
});
