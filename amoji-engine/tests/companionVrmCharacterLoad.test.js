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
