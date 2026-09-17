import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { replaceAvatarCanvas } from "../engine/companion/createAvatar.js";

const vrmSource = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), "../engine/companion/vrmAvatar.js"),
  "utf8",
);

describe("vrmAvatar boot clock", () => {
  it("does not assign t0 before it is declared", () => {
    const declareAt = vrmSource.search(/let t0 = performance\.now\(\);/);
    const assignAt = vrmSource.search(/^\s*t0 = performance\.now\(\);/m);
    expect(declareAt).toBeGreaterThanOrEqual(0);
    expect(assignAt).toBe(-1);
  });

  it("writes viseme morphs after expressionManager.update so Happy cannot freeze the jaw", () => {
    const start = vrmSource.indexOf("const applyTalkMouthNow");
    const fn = vrmSource.slice(start, start + 900);
    const updateAt = fn.indexOf("expr?.update");
    const morphAt = fn.indexOf("applyMorphMouthOpen");
    const emotionAt = fn.indexOf("applyTalkEmotionMorphs");
    expect(updateAt).toBeGreaterThan(0);
    expect(morphAt).toBeGreaterThan(updateAt);
    expect(emotionAt).toBeGreaterThan(morphAt);
    expect(fn).toContain("softenTalkMouthOverrides");
  });

  it("exposes getFaceReport and getFaceDebug for high-poly diagnostics", () => {
    expect(vrmSource).toContain("getFaceReport()");
    expect(vrmSource).toContain("getFaceDebug()");
    expect(vrmSource).toContain("companionMeshStats.js");
    expect(vrmSource).toContain("activeVisemePreset");
  });
});

describe("replaceAvatarCanvas", () => {
  it("uses the live canvas in the document when the passed node is detached", () => {
    const previousDocument = globalThis.document;
    const parent = {
      replaceChild(fresh, live) {
        this.replaced = { fresh, live };
      },
    };
    const live = {
      id: "avatar-canvas",
      className: "stage-canvas",
      parentNode: parent,
      cloneNode() {
        return {
          id: this.id,
          className: this.className,
          getAttribute: () => null,
          setAttribute() {},
        };
      },
      getAttribute() {
        return null;
      },
    };
    const detached = { id: "avatar-canvas", parentNode: null };
    globalThis.document = {
      getElementById: (id) => (id === "avatar-canvas" ? live : null),
    };
    try {
      const next = replaceAvatarCanvas(detached);
      expect(parent.replaced.live).toBe(live);
      expect(next.id).toBe("avatar-canvas");
    } finally {
      globalThis.document = previousDocument;
    }
  });
});
