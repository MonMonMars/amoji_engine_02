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

  it("skips when start picker was completed in storage", async () => {
    if (typeof localStorage === "undefined") return;
    localStorage.setItem("amoji.companion.startPickerCompleted.v1", "1");
    const params = new URLSearchParams("lang=en&pick=1");
    const picker = await bootEarlyStartPicker({ params });
    expect(picker).toBeNull();
    localStorage.removeItem("amoji.companion.startPickerCompleted.v1");
  });

  it("uses secretary title and badge when role=secretary", async () => {
    if (typeof document === "undefined") return;
    document.body.innerHTML =
      '<div id="amoji-boot-splash"><p>Loading</p></div>';
    globalThis.__amojiStart = { ready: false, run: null };
    globalThis.__amojiUnlockAudio = () => {};
    globalThis.__amojiHideLoading = () => {};
    globalThis.__amojiStartWithCharacter = () => {};

    const params = new URLSearchParams("lang=en&pick=1&role=secretary&automic=0");
    const picker = await bootEarlyStartPicker({ params });
    expect(
      picker?.element.querySelector(".companion-picker-title")?.textContent,
    ).toContain("secretary");
    expect(
      picker?.element.querySelectorAll(".companion-card-role-strip").length,
    ).toBe(0);
    picker?.destroy();
    document.body.classList.remove("companion-start-pending", "companion-picker-open");
  });
});
