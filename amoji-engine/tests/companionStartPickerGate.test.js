import { describe, expect, it } from "vitest";
import {
  bootSplashGateFromDom,
  clearStartPickerBodyLocks,
  dismissStartPickerDom,
  shouldAutoStartCompanionSession,
  shouldRemoveBootSplash,
  shouldShowStartPickerOnBoot,
} from "../engine/companion/companionStartPickerGate.mjs";

describe("companionStartPickerGate", () => {
  it("does not re-open start picker after begin was tapped", () => {
    const start = { tapped: true, pickerDismissed: true, sessionStarted: false };
    expect(
      shouldShowStartPickerOnBoot({
        pick: "1",
        start,
        sessionStartedLocal: false,
      }),
    ).toBe(false);
  });

  it("allows start picker on first visit with pick=1", () => {
    expect(
      shouldShowStartPickerOnBoot({
        pick: "1",
        start: { tapped: false, pickerDismissed: false },
      }),
    ).toBe(true);
  });

  it("skips start picker when completed flag is set unless pick=force", () => {
    const storage = {
      getItem: (k) =>
        k === "amoji.companion.startPickerCompleted.v1" ? "1" : null,
      setItem: () => {},
    };
    expect(
      shouldShowStartPickerOnBoot({
        pick: null,
        start: { tapped: false, pickerDismissed: false },
        storage,
      }),
    ).toBe(false);
    expect(
      shouldShowStartPickerOnBoot({
        pick: "1",
        start: { tapped: false, pickerDismissed: false },
        storage,
      }),
    ).toBe(false);
    expect(
      shouldShowStartPickerOnBoot({
        pick: "force",
        start: { tapped: false, pickerDismissed: false },
        storage,
      }),
    ).toBe(true);
  });

  it("auto-starts when picker was completed but pick=1", () => {
    const storage = {
      getItem: (k) =>
        k === "amoji.companion.startPickerCompleted.v1" ? "1" : null,
      setItem: () => {},
    };
    expect(
      shouldAutoStartCompanionSession({
        pick: "1",
        start: { tapped: false, pickerDismissed: false },
        storage,
      }),
    ).toBe(true);
  });

  it("does not remove boot splash until picker or session is visible", () => {
    expect(shouldRemoveBootSplash({ sessionStarted: false })).toBe(false);
    expect(shouldRemoveBootSplash({ pickerVisible: true })).toBe(true);
    expect(shouldRemoveBootSplash({ sessionStarted: true })).toBe(true);
  });

  it("bootSplashGateFromDom respects start-picker body class and fallback", () => {
    if (typeof document === "undefined") return;
    document.body.innerHTML =
      '<div id="amoji-boot-fallback" class="show"></div><div id="start-character-picker" class="hide" hidden></div>';
    document.body.classList.add("companion-start-picker-open");
    expect(
      bootSplashGateFromDom(document, { sessionStarted: false }),
    ).toBe(true);
    document.body.classList.remove("companion-start-picker-open");
    expect(
      bootSplashGateFromDom(document, { sessionStarted: false }),
    ).toBe(true);
    const fallback = document.getElementById("amoji-boot-fallback");
    fallback?.classList.remove("show");
    fallback?.setAttribute("hidden", "");
    expect(
      bootSplashGateFromDom(document, { sessionStarted: false }),
    ).toBe(false);
    document.body.innerHTML = "";
  });

  it("dismissStartPickerDom hides element and clears body locks", () => {
    if (typeof document === "undefined") return;
    const picker = document.createElement("div");
    picker.id = "start-character-picker";
    picker.classList.add("is-open");
    document.body.appendChild(picker);
    document.body.classList.add("companion-picker-open", "ui-page-open");
    const start = { tapped: false };
    dismissStartPickerDom(picker, start);
    expect(picker.classList.contains("hide")).toBe(true);
    expect(picker.hidden).toBe(true);
    expect(start.pickerDismissed).toBe(true);
    expect(document.body.classList.contains("companion-picker-open")).toBe(false);
    expect(document.body.classList.contains("companion-start-picker-open")).toBe(
      false,
    );
    expect(document.body.classList.contains("ui-page-open")).toBe(false);
    picker.remove();
    clearStartPickerBodyLocks();
  });
});
