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
  it("uses minimal chrome with mic, text field, top-left chip, and top-right menu", () => {
    expect(html).toContain("companion-minimal-chrome");
    expect(html).toMatch(/class="composer[^"]*composer-pro/);
    expect(html).toContain('id="btn-open-setup"');
    expect(html).toContain("topbar-setup-btn");
    expect(html).toContain('id="brand-btn"');
    expect(html).toContain('id="companion-status-line"');
    expect(html).not.toContain('id="mic-voice-hud"');
    expect(html).toContain('id="btn-mic"');
    expect(html).toContain('class="composer-field"');
    expect(html.indexOf('class="composer-field"')).toBeLessThan(
      html.indexOf('id="mic-voice-stack"'),
    );
    expect(minimalCss).toMatch(/companion-minimal-chrome \.composer-wrap[\s\S]*width:\s*100%/);
    expect(minimalCss).toMatch(/companion-minimal-chrome \.composer\.composer-pro[\s\S]*width:\s*100%/);
    expect(minimalCss).toMatch(/companion-minimal-chrome \.chat-column[\s\S]*width:\s*100%/);
    expect(minimalCss).not.toMatch(/companion-minimal-chrome \.chat-column[\s\S]*680px/);
    expect(html).toMatch(/\.composer \{[\s\S]*width:\s*100%/);
    expect(html).not.toMatch(/\.composer \{[\s\S]{0,220}min\(720px/);
    expect(html).not.toContain('id="composer-char-btn"');
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

  it("shows companion chip top-left and menu top-right; send visible in text composer", () => {
    expect(minimalCss).toMatch(/companion-minimal-chrome \.topbar[\s\S]*display:\s*flex/);
    expect(minimalCss).toContain("topbar-setup-btn");
    expect(minimalCss).not.toContain("mic-voice-hud");
    expect(minimalCss).toMatch(
      /companion-minimal-chrome:not\(\.composer-always-visible\) \.composer \.send[\s\S]*clip:\s*rect/,
    );
    expect(minimalCss).toContain(
      "body.companion-minimal-chrome.conversation-ui.composer-always-visible .composer .send",
    );
    expect(minimalCss).toContain("grid-template-rows");
  });
});
