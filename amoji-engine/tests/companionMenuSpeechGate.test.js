import { describe, expect, it, afterEach } from "vitest";
import {
  COMPANION_MENU_BODY_CLASSES,
  isCompanionMenuUiOpen,
  notifyCompanionMenuOverlayOpened,
  registerCompanionMenuSpeechController,
} from "../engine/companion/companionMenuSpeechGate.js";

/** @param {string} html */
function mockDoc(html, bodyClasses = []) {
  const el = (id) => {
    const m = html.match(new RegExp(`id="${id}"[^>]*class="([^"]*)"`, "i"));
    if (!m) return { classList: { contains: () => false } };
    const classes = new Set(m[1].split(/\s+/).filter(Boolean));
    return {
      classList: {
        contains: (c) => classes.has(c),
      },
    };
  };
  const bodySet = new Set(bodyClasses);
  return {
    body: {
      classList: { contains: (c) => bodySet.has(c) },
    },
    getElementById: (id) => el(id),
    querySelector: (sel) => {
      if (sel === ".secretary-overlay.is-open") return null;
      return null;
    },
  };
}

describe("companionMenuSpeechGate", () => {
  afterEach(() => {
    registerCompanionMenuSpeechController(null);
  });

  it("tracks menu body classes", () => {
    expect(COMPANION_MENU_BODY_CLASSES).toContain("settings-open");
    const doc = mockDoc("", ["settings-open"]);
    expect(isCompanionMenuUiOpen(doc)).toBe(true);
  });

  it("detects open settings panel", () => {
    const doc = mockDoc('<div id="settings" class="settings open"></div>');
    expect(isCompanionMenuUiOpen(doc)).toBe(true);
  });

  it("detects start picker when open and visible", () => {
    const doc = mockDoc(
      '<div id="start-character-picker" class="companion-picker is-open"></div>',
    );
    expect(isCompanionMenuUiOpen(doc)).toBe(true);
  });

  it("notifyCompanionMenuOverlayOpened invokes registered pause hook", () => {
    let paused = 0;
    registerCompanionMenuSpeechController({
      pauseForMenu: () => {
        paused += 1;
      },
    });
    notifyCompanionMenuOverlayOpened();
    expect(paused).toBe(1);
  });
});
