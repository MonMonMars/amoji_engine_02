import { describe, expect, it } from "vitest";
import {
  cleanComposerPlaceholder,
  COMPANION_CLEAN_UI,
  shouldShowChatBubble,
  shouldShowStarterPrompts,
  shouldShowToast,
} from "../engine/companion/companionCleanUi.js";

describe("companionCleanUi", () => {
  it("enables clean UI by default", () => {
    expect(COMPANION_CLEAN_UI).toBe(true);
  });

  it("suppresses info toasts and system bubbles", () => {
    expect(shouldShowToast("info")).toBe(false);
    expect(shouldShowToast("error")).toBe(true);
    expect(shouldShowChatBubble("system")).toBe(false);
    expect(shouldShowChatBubble("assistant")).toBe(true);
    expect(shouldShowChatBubble("system", { force: true })).toBe(true);
  });

  it("hides starter prompts and uses minimal placeholder", () => {
    expect(shouldShowStarterPrompts()).toBe(false);
    expect(cleanComposerPlaceholder(true)).toBe("Message…");
    expect(cleanComposerPlaceholder(false)).toBe("輸入…");
  });
});
