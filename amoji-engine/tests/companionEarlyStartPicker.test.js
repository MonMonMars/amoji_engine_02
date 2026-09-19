import { describe, expect, it } from "vitest";
import {
  COMPANION_EARLY_START_PICKER_SCHEMA,
  bootEarlyStartPicker,
} from "../engine/companion/companionEarlyStartPicker.js";

describe("companionEarlyStartPicker", () => {
  it("exports schema", () => {
    expect(COMPANION_EARLY_START_PICKER_SCHEMA).toMatch(/earlyStartPicker/i);
  });

  it("boots picker and removes boot splash when pick=1", async () => {
    if (typeof document === "undefined") return;
    document.body.innerHTML =
      '<div id="amoji-boot-splash"><p>Loading</p></div>';
    globalThis.__amojiStart = {
      ready: false,
      run: null,
      sessionStarted: false,
      starting: false,
    };
    globalThis.__amojiUnlockAudio = () => {};
    globalThis.__amojiHideLoading = () => {};
    globalThis.__amojiStartWithCharacter = () => {};

    const params = new URLSearchParams("lang=en&pick=1&automic=0");
    const picker = await bootEarlyStartPicker({ params });
    expect(picker).toBeTruthy();
    expect(picker.element.querySelector(".picker-begin-btn")).toBeTruthy();
    expect(picker.element.classList.contains("companion-picker--showcase")).toBe(
      true,
    );
    expect(document.getElementById("amoji-boot-splash")).toBeNull();
    picker.destroy();
    document.body.classList.remove("companion-start-pending", "companion-picker-open");
  });

  it("skips when autostart=1", async () => {
    const params = new URLSearchParams("autostart=1");
    const picker = await bootEarlyStartPicker({ params });
    expect(picker).toBeNull();
  });
});
