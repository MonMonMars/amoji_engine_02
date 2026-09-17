import { describe, expect, it } from "vitest";
import { sortModelUrlsForPreload } from "../engine/companion/companionVrmInspect.js";
import { uniqueCharacterModelUrls } from "../engine/companion/companionCharacterPreload.js";

describe("companionCharacterPreload", () => {
  it("preloads Kizuna high-poly model before other roster VRMs", () => {
    const urls = sortModelUrlsForPreload(uniqueCharacterModelUrls("en"));
    expect(urls[0]).toContain("kizuna-kamatte.vrm");
  });
});
