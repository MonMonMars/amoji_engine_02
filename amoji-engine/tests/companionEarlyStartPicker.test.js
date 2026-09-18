import { describe, expect, it } from "vitest";
import {
  COMPANION_EARLY_START_PICKER_SCHEMA,
  bootEarlyStartPicker,
} from "../engine/companion/companionEarlyStartPicker.js";

describe("companionEarlyStartPicker", () => {
  it("exports schema", () => {
    expect(COMPANION_EARLY_START_PICKER_SCHEMA).toMatch(/earlyStartPicker/i);
  });

  it("boots picker before heavy modules when pick=1", async () => {
    if (typeof document === "undefined") return;
    globalThis.__amojiStart = {
      ready: false,
      run: null,
      sessionStarted: false,
      starting: false,
    };
    globalThis.__amojiUnlockAudio = () => {};
    globalThis.__amojiHideLoading = () => {};
    globalThis.__amojiStartWithCharacter = () => {};

    const ami = (path) =>
      import(path.replace("../amoji-engine/engine/", "../engine/"));
    const params = new URLSearchParams("lang=en&pick=1&automic=0");
    const picker = await bootEarlyStartPicker(ami, { params });
    expect(picker).toBeTruthy();
    expect(picker.element.querySelector(".picker-begin-btn")).toBeTruthy();
    expect(document.getElementById("start-character-picker")).toBeTruthy();
    picker.destroy();
    document.body.classList.remove("companion-start-pending", "companion-picker-open");
  });

  it("skips when autostart=1", async () => {
    const ami = (path) =>
      import(path.replace("../amoji-engine/engine/", "../engine/"));
    const params = new URLSearchParams("autostart=1");
    const picker = await bootEarlyStartPicker(ami, { params });
    expect(picker).toBeNull();
  });
});
