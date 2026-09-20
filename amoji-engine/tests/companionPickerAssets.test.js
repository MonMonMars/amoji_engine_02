import { describe, expect, it } from "vitest";
import {
  PICKER_SCENE_ART_REVISION,
  pickerAaaBgUrl,
  pickerArtFetchUrl,
} from "../engine/companion/companionPickerAssets.mjs";

describe("companionPickerAssets", () => {
  it("cache-busts picker and scene art urls", () => {
    const url = pickerAaaBgUrl("build-test");
    expect(url).toContain("picker-aaa-bg.png");
    expect(url).toContain(PICKER_SCENE_ART_REVISION);
    expect(pickerArtFetchUrl("/prototypes/assets/companion-bg-anime.png", "b1")).toContain(
      "companion-bg-anime.png",
    );
  });
});
