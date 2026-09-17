import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const html = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), "../../prototypes/vrm-highpoly-face-test.html"),
  "utf8",
);

describe("vrm-highpoly-face-test.html", () => {
  it("maps three-vrm-animation for vrmAvatar imports", () => {
    expect(html).toContain("@pixiv/three-vrm-animation");
    expect(html).toContain("three-vrm-animation.module.min.js");
  });

  it("includes Kizuna high-poly model and lip sync controls", () => {
    expect(html).toContain("kizuna-kamatte.vrm");
    expect(html).toContain("cycle-visemes");
    expect(html).toContain("getFaceDebug");
    expect(html).toContain("setMouthOpen");
    expect(html).toContain("setMouthShape");
  });
});
