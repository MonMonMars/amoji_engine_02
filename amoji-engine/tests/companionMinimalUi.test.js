import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const html = readFileSync(join(root, "prototypes/amoji-companion.html"), "utf8");
const minimalCss = readFileSync(
  join(root, "prototypes/companion-minimal-ui.css"),
  "utf8",
);

describe("companionMinimalUi", () => {
  it("uses minimal chrome with mic, text field, and menu only", () => {
    expect(html).toContain("companion-minimal-chrome");
    expect(html).toMatch(/class="composer[^"]*composer-pro/);
    expect(html).toContain('class="composer-settings-btn"');
    expect(html).toContain('id="btn-open-setup"');
    expect(html).toContain('class="composer-field"');
    expect(html).not.toContain('id="btn-toggle-chat"');
    expect(html).not.toContain('id="btn-talk-speed"');
    expect(html).not.toContain('id="btn-open-scene"');
  });

  it("moves secondary controls into the settings menu", () => {
    expect(html).toContain('id="settings-btn-chat"');
    expect(html).toContain('id="settings-btn-talk-speed"');
    expect(html).not.toContain('id="settings-btn-scene-sheet"');
    expect(html).not.toContain('id="btn-settings"');
    expect(html).toContain('id="settings-btn-speaker"');
  });

  it("hides topbar; send visible in text composer, sr-only in voice-only", () => {
    expect(minimalCss).toMatch(/companion-minimal-chrome \.topbar[\s\S]*display:\s*none/);
    expect(minimalCss).toMatch(
      /companion-minimal-chrome:not\(\.composer-always-visible\) \.composer \.send[\s\S]*clip:\s*rect/,
    );
    expect(minimalCss).toContain(
      "body.companion-minimal-chrome.conversation-ui.composer-always-visible .composer .send",
    );
    expect(minimalCss).toContain("grid-template-rows");
  });
});
