import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import {
  titleScreenKicker,
  titleScreenLogo,
  titleScreenTagline,
} from "../engine/companion/companionTitleScreen.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const html = readFileSync(join(root, "prototypes/amoji-companion.html"), "utf8");
const css = readFileSync(
  join(root, "prototypes/companion-title-screen.css"),
  "utf8",
);

describe("companionTitleScreen", () => {
  it("exports bilingual title copy", () => {
    expect(titleScreenLogo()).toBe("AMOJI");
    expect(titleScreenKicker(true)).toMatch(/Voice/);
    expect(titleScreenTagline(false)).toMatch(/同伴/);
  });

  it("links anime title screen markup and art", () => {
    expect(html).toContain("companion-title-screen.css");
    expect(html).toContain("amoji-title-screen");
    expect(html).toContain("title-screen-logo");
    expect(css).toContain("title-screen-anime-bg.png");
  });
});
