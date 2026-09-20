import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { bindCompanionComposerFocusGuard } from "../engine/companion/companionComposerFocus.js";

describe("companionComposerFocus", () => {
  /** @type {HTMLTextAreaElement} */
  let input;
  /** @type {HTMLFormElement} */
  let form;

  beforeEach(() => {
    if (typeof document === "undefined") return;
    input = document.createElement("textarea");
    form = document.createElement("form");
    form.className = "composer";
    form.appendChild(input);
    document.body.appendChild(form);
  });

  afterEach(() => {
    form?.remove?.();
  });

  it("blurs composer on visibility resume without a user tap", () => {
    if (typeof document === "undefined") return;
    const guard = bindCompanionComposerFocusGuard({ input, composerRoot: form });
    input.focus();
    expect(document.activeElement).toBe(input);

    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      value: "visible",
    });
    document.dispatchEvent(new Event("visibilitychange"));

    expect(document.activeElement).not.toBe(input);
    guard.destroy();
  });

  it("focusComposer only works when user initiated", () => {
    if (typeof document === "undefined") return;
    const guard = bindCompanionComposerFocusGuard({ input, composerRoot: form });
    expect(guard.focusComposer(false)).toBe(false);
    expect(document.activeElement).not.toBe(input);

    expect(guard.focusComposer(true)).toBe(true);
    expect(document.activeElement).toBe(input);
    guard.destroy();
  });

  it("keeps focus after explicit pointerdown on the textarea", () => {
    if (typeof document === "undefined") return;
    const guard = bindCompanionComposerFocusGuard({ input, composerRoot: form });
    input.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
    input.focus();
    document.dispatchEvent(new Event("visibilitychange"));
    expect(document.activeElement).toBe(input);
    guard.destroy();
  });
});
