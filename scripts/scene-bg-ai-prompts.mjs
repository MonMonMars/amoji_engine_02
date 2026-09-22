/**
 * OpenAI image prompts for companion scene backgrounds (16:9, avatar-safe center).
 * Used by scripts/generate-scene-backgrounds-ai.mjs
 */
import { SCENE_BACKGROUND_PRESETS } from "../amoji-engine/engine/companion/companionScenePresets.js";

const AVATAR_SAFE =
  "Wide 16:9 anime visual-novel background, empty room center for standing character, no people, no text, no logos, high detail, soft cinematic lighting, painterly gacha-game quality.";

/** @type {Record<string, string>} */
const SCENE_PROMPT_OVERRIDES = {
  bedroom:
    "Warm cozy anime bedroom at night, fairy lights, wood floor, city bokeh through window, lavender bedding, plush toys, floor lamp glow, visual novel background art, ultra detailed, no people.",
  "cozy-room":
    "Warm anime living nook at night, fairy lights, bookshelf, soft sofa, wood floor, city lights through window, visual novel background, no people.",
  "night-city":
    "Cyberpunk anime city at night, neon signs, wet street reflections, bokeh, visual novel background, no people.",
  minimal:
    "Minimal dark anime stage, subtle blue rim light, abstract soft gradients, visual novel background, no people.",
};

/**
 * @param {string} presetId
 * @param {string} labelEn
 */
export function sceneBackgroundAiPrompt(presetId, labelEn) {
  const custom = SCENE_PROMPT_OVERRIDES[presetId];
  if (custom) return custom;
  return `${AVATAR_SAFE} Scene: ${labelEn}. Japanese anime illustration style, rich atmosphere.`;
}

/** @type {ReadonlyArray<{ id: string, labelEn: string, prompt: string }>} */
export const SCENE_AI_PROMPT_LIST = SCENE_BACKGROUND_PRESETS.map((p) => ({
  id: p.id,
  labelEn: p.labelEn,
  prompt: sceneBackgroundAiPrompt(p.id, p.labelEn),
}));
