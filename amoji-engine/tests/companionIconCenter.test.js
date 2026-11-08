import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const html = readFileSync(join(root, "prototypes/amoji-companion.html"), "utf8");
const grok = readFileSync(join(root, "prototypes/companion-grok-ani.css"), "utf8");
const picker = readFileSync(
  join(root, "amoji-engine/engine/companion/companionCharacterPicker.js"),
  "utf8",
);
const voicePicker = readFileSync(
  join(root, "amoji-engine/engine/companion/companionVoicePicker.js"),
  "utf8",
);

function block(src, start) {
  const i = src.indexOf(start);
  if (i < 0) return "";
  const open = src.indexOf("{", i);
  const close = src.indexOf("}", open);
  if (open < 0 || close < 0) return "";
  return src.slice(open, close + 1);
}

describe("circular icon centering", () => {
  it("centers round buttons with flex and zero line-height", () => {
    const css = block(
      html,
      ".icon-btn,\n      .send,\n      .topbar-btn--icon",
    );
    expect(css).toContain("display: inline-flex");
    expect(css).toContain("align-items: center");
    expect(css).toContain("justify-content: center");
    expect(css).toContain("line-height: 0");
    expect(css).toContain("padding: 0");
  });

  it("keeps composer round buttons centered under conversation-ui overrides", () => {
    const css = block(
      html,
      "body.conversation-ui.composer-always-visible .composer .send",
    );
    expect(css).toContain("display: inline-flex !important");
    expect(css).toContain("align-items: center");
    expect(css).toContain("justify-content: center");
    expect(html).not.toMatch(
      /composer-always-visible \.stage\.mic-mode \.composer \.send \{\s*display:\s*block !important/,
    );
  });

  it("uses centered SVG glyphs instead of emoji in round buttons", () => {
    expect(html).toMatch(/id="btn-toggle-chat"[\s\S]{0,500}<svg class="btn-icon"/);
    expect(html).toMatch(/id="btn-open-scene"[\s\S]{0,500}<svg class="btn-icon"/);
    expect(html).toMatch(/id="btn-open-setup"[\s\S]{0,500}<svg class="btn-icon"/);
    expect(html).toMatch(/id="send"[\s\S]{0,400}<svg class="btn-icon"/);
    expect(html).toContain("btn-icon--speaker-on");
    expect(html).toContain("btn-icon--speaker-off");
    expect(html).not.toContain('btnSpeaker.textContent = on ? "🔊"');
    expect(html).not.toContain('btnToggleChat.textContent = "💬"');
    expect(html).not.toContain('btnOpenScene.textContent = "🎨"');
    expect(html).not.toContain('btnOpenSetup.textContent = "⋯"');
    expect(html).not.toMatch(/id="btn-toggle-chat"[\s\S]{0,400}💬/);
    expect(html).not.toMatch(/id="send"[^>]*>↑</);
  });

  it("centers sheet close buttons with SVG X", () => {
    expect(html).toMatch(/id="settings-close"[\s\S]{0,400}<svg class="btn-icon"/);
    expect(html).toMatch(/id="scene-sheet-close"[\s\S]{0,400}<svg class="btn-icon"/);
    expect(picker).toContain("companion-picker-close");
    expect(picker).toContain('<svg class="btn-icon"');
    expect(voicePicker).toContain('<svg class="btn-icon"');
  });

  it("keeps icon topbar padding at zero after the text-button rule", () => {
    const css = block(html, ".topbar-btn.topbar-btn--icon");
    expect(css).toContain("padding: 0");
    expect(css).toContain("display: inline-flex");
    expect(css).toContain("align-items: center");
  });

  it("keeps grok-ani send and speaker buttons as flex-centered circles", () => {
    expect(grok).toMatch(
      /\.theme-grok-ani \.composer \.send \{[^}]*display:\s*inline-flex/,
    );
    expect(grok).toMatch(
      /\.theme-grok-ani \.composer \.send \{[^}]*align-items:\s*center/,
    );
    expect(grok).toMatch(
      /\.theme-grok-ani \.composer \.speaker-btn \{[^}]*border-radius:\s*999px[^}]*display:\s*inline-flex/,
    );
    expect(grok).toMatch(
      /\.theme-grok-ani \.composer \.speaker-btn \{[^}]*justify-content:\s*center/,
    );
  });
});
