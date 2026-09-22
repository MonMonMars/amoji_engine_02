import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const companionHtml = readFileSync(
  join(root, "prototypes/amoji-companion.html"),
  "utf8",
);

describe("companion boot splash wiring", () => {
  it("wires shared bootSplashGateFromDom on window", () => {
    expect(companionHtml).toContain("bootSplashGateFromDom");
    expect(companionHtml).toContain("__amojiShouldRemoveBootSplash");
  });

  it("clears companion-start-pending when session becomes ready", () => {
    expect(companionHtml).toContain(
      'document.body.classList.remove("companion-start-pending")',
    );
  });
});
