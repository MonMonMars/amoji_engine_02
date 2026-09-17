/**
 * Shared emotion demo lines for voice comparison UI + sample generator.
 */
export const EMOTION_DEMO_LINES = Object.freeze({
  en: Object.freeze({
    happy: Object.freeze({
      text: "Oh wow — that's amazing! I'm so happy for you!",
      emotion: "happy",
      nuance: "excited",
      talkStyle: "celebrate",
      speechEnergy: 0.88,
    }),
    sad: Object.freeze({
      text: "Hey... I'm really sorry you're going through this. I'm here.",
      emotion: "sad",
      nuance: "stress",
      talkStyle: "soft",
      speechEnergy: 0.48,
    }),
    surprised: Object.freeze({
      text: "Wait — what?! No way!!",
      emotion: "surprised",
      nuance: "excited",
      talkStyle: "celebrate",
      speechEnergy: 0.9,
    }),
    thinking: Object.freeze({
      text: "Hmm... let me think about that for a second.",
      emotion: "thinking",
      nuance: "curious",
      talkStyle: "thinking",
      speechEnergy: 0.55,
    }),
  }),
  yue: Object.freeze({
    happy: Object.freeze({
      text: "哇！真係好開心呀！",
      emotion: "happy",
      nuance: "excited",
      talkStyle: "celebrate",
      speechEnergy: 0.88,
    }),
    sad: Object.freeze({
      text: "嗯...我陪住你，唔使怕。",
      emotion: "sad",
      nuance: "stress",
      talkStyle: "soft",
      speechEnergy: 0.48,
    }),
    surprised: Object.freeze({
      text: "吓？真係？！",
      emotion: "surprised",
      nuance: "excited",
      talkStyle: "celebrate",
      speechEnergy: 0.9,
    }),
    thinking: Object.freeze({
      text: "嗯...等我諗諗先。",
      emotion: "thinking",
      nuance: "curious",
      talkStyle: "thinking",
      speechEnergy: 0.55,
    }),
  }),
});

/** Default voices for offline sample generation. */
export const EMOTION_DEMO_VOICES = Object.freeze({
  en: Object.freeze([
    "en-US-AriaNeural",
    "en-US-JennyNeural",
    "en-US-GuyNeural",
    "en-HK-YanNeural",
    "openai-coral",
    "openai-marin",
    "openai-shimmer",
  ]),
  yue: Object.freeze([
    "zh-HK-HiuMaanNeural",
    "zh-HK-HiuGaaiNeural",
    "zh-HK-WanLungNeural",
  ]),
});
