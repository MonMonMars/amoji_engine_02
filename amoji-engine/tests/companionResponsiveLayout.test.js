import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const html = readFileSync(join(root, "prototypes/amoji-companion.html"), "utf8");
const layoutCss = readFileSync(
  join(root, "prototypes/companion-responsive-layout.css"),
  "utf8",
);

describe("companionResponsiveLayout", () => {
  it("links responsive layout stylesheet", () => {
    expect(html).toContain("companion-responsive-layout.css");
  });

  it("stacks starter chips vertically and keeps them in the column", () => {
    expect(layoutCss).toMatch(/\.starter-prompts__chips[\s\S]*flex-direction:\s*column/);
    expect(layoutCss).toMatch(/\.starter-prompts__chips[\s\S]*overflow-x:\s*hidden/);
    expect(layoutCss).toMatch(/\.starter-chip[\s\S]*width:\s*100%/);
  });

  it("aligns transcript padding with composer column", () => {
    expect(layoutCss).toMatch(
      /body\.conversation-ui \.transcript[\s\S]*padding-left:\s*0/,
    );
    expect(layoutCss).toMatch(
      /body\.conversation-ui \.chat-column[\s\S]*safe-area-inset-left/,
    );
  });
});
