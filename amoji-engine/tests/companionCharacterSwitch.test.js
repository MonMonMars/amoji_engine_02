import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  buildCharacterSystemPrompt,
  characterAvatarConfig,
  characterTapLines,
} from "../engine/companion/companionCharacterCatalog.js";

const switchSource = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), "../engine/companion/companionCharacterSwitch.js"),
  "utf8",
);
const companionHtml = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), "../../prototypes/amoji-companion.html"),
  "utf8",
);
const vrmSource = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), "../engine/companion/vrmAvatar.js"),
  "utf8",
);

describe("companionCharacterSwitch helpers", () => {
  it("builds per-character session bundle for hot swap", () => {
    const id = "kizuna";
    const config = characterAvatarConfig(id, "en");
    const prompt = buildCharacterSystemPrompt(id, true);
    const lines = characterTapLines(id, true);

    expect(config.modelUrl).toContain("companion-kizuna.vrm");
    expect(config.avatarPrefer).toBe("vrm");
    expect(prompt).toMatch(/Kizuna/i);
    expect(lines.some((l) => /Kizuna|believe/i.test(l))).toBe(true);
  });

  it("replaces the canvas before disposing WebGL on hot swap", () => {
    const replaceAt = switchSource.indexOf("replaceAvatarCanvas(canvas)");
    const disposeAt = switchSource.indexOf("currentAvatar?.dispose?.()");
    expect(replaceAt).toBeGreaterThan(0);
    expect(disposeAt).toBeGreaterThan(replaceAt);
  });

  it("does not force WebGL context loss on avatar dispose (character switch)", () => {
    expect(vrmSource).not.toContain("forceContextLoss");
  });

  it("does not chain hotSwap from stale beginAvatarLoad completions", () => {
    const loadBlock = companionHtml.slice(
      companionHtml.indexOf("const beginAvatarLoad = () =>"),
      companionHtml.indexOf("const setCharacterUi = () =>"),
    );
    expect(loadBlock).not.toMatch(
      /loadEpoch\s*!==\s*avatarEpoch[\s\S]*hotSwapCharacter/,
    );
    expect(loadBlock).not.toMatch(
      /loadForCharacterId\s*!==\s*characterId[\s\S]*hotSwapCharacter/,
    );
  });

  it("switches voice + model config between characters", () => {
    const nova = characterAvatarConfig("nova", "yue");
    const rin = characterAvatarConfig("rin", "yue");
    expect(nova.voiceId).not.toBe(rin.voiceId);
    expect(nova.modelUrl).not.toBe(rin.modelUrl);
    expect(rin.modelUrl).toContain("companion-rin.vrm");
  });
});
