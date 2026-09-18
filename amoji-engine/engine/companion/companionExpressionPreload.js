/**
 * Idle + talk facial expression preload — warm VRM morph blends and speech-face timelines.
 */
import { buildVrmExpressionBlend } from "./companionContentMotion.js";
import {
  buildSpeechExpressionTimelineCached,
  tokenizeSpeakUnits,
} from "./companionSpeechFace.js";
import { collectWaitPreloadExpressionProfiles } from "./companionWaitAssets.js";

export const COMPANION_EXPRESSION_PRELOAD_SCHEMA =
  "amoji.companionExpressionPreload.v1";

/** Common idle / talk lines — prebuild word-level face timelines at boot. */
export const IDLE_TALK_SPEECH_FACE_SAMPLES = Object.freeze([
  { text: "嗯……", emotion: "thinking", nuance: "curious" },
  { text: "你好呀！", emotion: "happy", nuance: "excited" },
  { text: "Hi!", emotion: "happy", nuance: "excited" },
  { text: "今日點呀？", emotion: "happy", nuance: "none" },
  { text: "How are you?", emotion: "happy", nuance: "none" },
  { text: "等我諗諗……", emotion: "thinking", nuance: "curious" },
  { text: "Let me think…", emotion: "thinking", nuance: "curious" },
  { text: "哈哈！", emotion: "happy", nuance: "excited" },
  { text: "Haha!", emotion: "happy", nuance: "excited" },
  { text: "真係？", emotion: "surprised", nuance: "curious" },
  { text: "Really?", emotion: "surprised", nuance: "curious" },
  { text: "唔好意思……", emotion: "sad", nuance: "stress" },
  { text: "Sorry…", emotion: "sad", nuance: "stress" },
  { text: "好呀！", emotion: "happy", nuance: "excited" },
  { text: "Sure!", emotion: "happy", nuance: "excited" },
  { text: "明白啦。", emotion: "neutral", nuance: "none" },
  { text: "Got it.", emotion: "neutral", nuance: "none" },
  { text: "哇！", emotion: "surprised", nuance: "excited" },
  { text: "Wow!", emotion: "surprised", nuance: "excited" },
  { text: "鍾意你～", emotion: "happy", nuance: "love" },
  { text: "Love you~", emotion: "happy", nuance: "love" },
  { text: "……", emotion: "thinking", nuance: "none" },
  { text: "…", emotion: "neutral", nuance: "none" },
]);

/** Extra word-level units hit often during talk streams. */
export const IDLE_TALK_SPEECH_FACE_UNITS = Object.freeze([
  "呀",
  "啊",
  "嗯",
  "哦",
  "呢",
  "嘛",
  "！",
  "？",
  "…",
  "哈",
  "wow",
  "hmm",
  "yes",
  "no",
  "ok",
  "thanks",
  "sorry",
  "love",
  "really",
  "nice",
]);

/**
 * All emotion × nuance blends used while idling or talking.
 */
export function collectIdleTalkExpressionProfiles() {
  return collectWaitPreloadExpressionProfiles();
}

/**
 * Prebuild speech-face timelines for common idle/talk phrases.
 * @param {readonly { text: string, emotion?: string, nuance?: string }[]} [samples]
 */
export function primeIdleTalkSpeechFaceCache(
  samples = IDLE_TALK_SPEECH_FACE_SAMPLES,
) {
  let warmed = 0;
  for (const sample of samples) {
    buildSpeechExpressionTimelineCached(sample.text, sample);
    warmed += 1;
  }
  for (const unit of IDLE_TALK_SPEECH_FACE_UNITS) {
    for (const base of [
      { emotion: "neutral", nuance: "none" },
      { emotion: "happy", nuance: "excited" },
      { emotion: "thinking", nuance: "curious" },
    ]) {
      if (tokenizeSpeakUnits(unit).length) {
        buildSpeechExpressionTimelineCached(unit, base);
        warmed += 1;
      }
    }
  }
  return { ok: true, warmed };
}

/**
 * Touch every idle/talk expression blend on the avatar (VRM morph compile).
 * @param {{
 *   applyExpressionProfile?: (profile: object) => unknown,
 *   setEmotion?: (emotion: string) => unknown,
 *   warmExpressionPresets?: () => unknown,
 * }} avatar
 * @param {{
 *   profiles?: Array<{ emotion: string, nuance: string }>,
 *   maxProfiles?: number,
 * }} [opts]
 */
export async function warmAvatarIdleTalkExpressions(avatar, opts = {}) {
  if (!avatar) return { ok: false, reason: "no-avatar" };

  avatar.warmExpressionPresets?.();

  const allProfiles = opts.profiles || collectIdleTalkExpressionProfiles();
  const maxProfiles = opts.maxProfiles ?? allProfiles.length;
  const profiles = allProfiles.slice(0, maxProfiles);

  if (!avatar.applyExpressionProfile) {
    return {
      ok: Boolean(avatar.warmExpressionPresets),
      warmed: 0,
      reason: avatar.warmExpressionPresets ? "presets-only" : "no-expression-api",
    };
  }

  let warmed = 0;
  for (const profile of profiles) {
    avatar.applyExpressionProfile({
      emotion: profile.emotion,
      nuance: profile.nuance,
      blend: profile.blend || buildVrmExpressionBlend(profile.emotion, profile.nuance),
    });
    warmed += 1;
  }

  avatar.setEmotion?.("neutral");
  avatar.applyExpressionProfile?.({ emotion: "neutral", nuance: "none" });

  return { ok: true, warmed, total: profiles.length };
}
