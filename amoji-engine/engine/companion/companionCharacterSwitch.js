/**
 * Hot-swap companion character without full page reload (Grok Ani–style).
 */
import { createCompanionAvatar, replaceAvatarCanvas } from "./createAvatar.js";
import {
  buildCharacterSystemPrompt,
  characterAvatarConfig,
  characterTapLines,
  persistCharacterId,
} from "./companionCharacterCatalog.js";
import { characterModelFetchUrl } from "./companionModelAssets.mjs";
import { releaseVrmPreloadExcept } from "./companionPreload.js";

export const COMPANION_CHARACTER_SWITCH_SCHEMA =
  "amoji.companionCharacterSwitch.v1";

/**
 * @param {{
 *   canvas: HTMLCanvasElement,
 *   controlsElement?: HTMLElement | null,
 *   characterId: string,
 *   langCode: "yue" | "en",
 *   currentAvatar?: { dispose?: () => void } | null,
 *   previewImageUrl?: string | null,
 *   onStagePreview?: (url: string | null) => void,
 *   onProgress?: (pct: number, label: string) => void,
 *   onCharacterTap?: () => void,
 * }} opts
 */
export async function switchCompanionCharacter(opts) {
  const {
    canvas,
    controlsElement,
    characterId,
    langCode,
    currentAvatar,
    previewImageUrl,
    onStagePreview,
    onProgress,
    onCharacterTap,
  } = opts;
  const isEnglish = langCode === "en";
  const config = characterAvatarConfig(characterId, langCode);
  const modelFetchUrl = characterModelFetchUrl(characterId, langCode);
  releaseVrmPreloadExcept(config.modelUrl);

  const emit = (pct, label) => onProgress?.(pct, label);

  emit(5, isEnglish ? "Preparing…" : "準備中…");
  onStagePreview?.(previewImageUrl || config.previewImage || null);

  emit(12, isEnglish ? "Clearing stage…" : "清理場景…");
  const freshCanvas = replaceAvatarCanvas(canvas);

  emit(22, isEnglish ? "Downloading model…" : "下載模型中…");
  const loaded = await createCompanionAvatar({
    canvas: freshCanvas,
    controlsElement,
    characterId,
    modelUrl: modelFetchUrl,
    prefer: config.avatarPrefer,
    onCharacterTap,
    onProgress: (pct, _label) => {
      const mapped = 22 + Math.round((Math.max(0, Math.min(100, pct)) / 100) * 58);
      emit(
        mapped,
        isEnglish ? "Downloading model…" : "下載模型中…",
      );
    },
  });

  try {
    currentAvatar?.dispose?.();
  } catch {
    /* ignore dispose errors */
  }

  emit(88, isEnglish ? "Warming up…" : "熱身中…");
  loaded.avatar.setEmotion?.("happy");
  loaded.avatar.resize?.();
  onStagePreview?.(null);

  persistCharacterId(characterId);

  const url = new URL(globalThis.location?.href || "/");
  url.searchParams.set("character", characterId);
  url.searchParams.set("lang", langCode === "en" ? "en" : "yue");
  url.searchParams.delete("vrm");
  url.searchParams.delete("model3d");
  url.searchParams.delete("avatar");
  globalThis.history?.replaceState?.({}, "", `${url.pathname}${url.search}`);

  emit(100, isEnglish ? "Ready!" : "完成！");

  return {
    avatar: loaded.avatar,
    kind: loaded.kind,
    canvas: loaded.canvas || freshCanvas,
    characterId,
    systemPrompt: buildCharacterSystemPrompt(characterId, isEnglish),
    voiceId: config.voiceId,
    tapLines: characterTapLines(characterId, isEnglish),
  };
}
