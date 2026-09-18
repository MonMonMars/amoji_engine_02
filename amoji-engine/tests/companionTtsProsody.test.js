import { describe, expect, it } from "vitest";
import {
  buildCloudTtsRequestBody,
  buildTtsInstruct,
  enrichTtsPerformance,
  inferSpeechEmotionFromText,
  instructSpeakingSpeed,
  normalizeTtsPerformance,
  resolveChunkTtsPerformance,
  resolveCompanionTtsProsody,
  resolveVoicePerformanceFromReply,
  voicePerformanceFromAnalysis,
} from "../engine/companion/companionTtsProsody.js";
import { analyzeSpeechChunk } from "../engine/companion/companionContentMotion.js";

describe("companionTtsProsody", () => {
  it("boosts happy excited speech above neutral", () => {
    const neutral = resolveCompanionTtsProsody({
      emotion: "neutral",
      text: "你好。",
    });
    const happy = resolveCompanionTtsProsody({
      emotion: "happy",
      nuance: "excited",
      talkStyle: "celebrate",
      speechEnergy: 0.85,
      text: "哇！真係好開心呀！",
    });
    const neutralRate = Number(neutral.edge.rate.replace(/[^0-9-]/g, ""));
    const happyRate = Number(happy.edge.rate.replace(/[^0-9-]/g, ""));
    expect(happyRate).toBeGreaterThan(neutralRate);
    expect(happyRate).toBeGreaterThan(20);
    expect(happyRate).toBeLessThan(55);
    expect(happy.browser.pitch).toBeGreaterThan(neutral.browser.pitch);
    expect(happy.browser.rate).toBeGreaterThan(neutral.browser.rate);
  });

  it("applies character-specific prosody bias", () => {
    const calm = resolveCompanionTtsProsody({
      emotion: "thinking",
      talkStyle: "thinking",
      speechEnergy: 0.45,
      text: "嗯，我明白你的意思，讓我慢慢整理一下。",
      characterId: "sora",
      speedMultiplier: 1,
    });
    const hype = resolveCompanionTtsProsody({
      emotion: "thinking",
      talkStyle: "thinking",
      speechEnergy: 0.45,
      text: "嗯，我明白你的意思，讓我慢慢整理一下。",
      characterId: "kizuna",
      speedMultiplier: 1,
    });
    expect(hype.browser.rate).toBeGreaterThan(calm.browser.rate);
    expect(hype.browser.pitch).toBeGreaterThan(calm.browser.pitch);
  });

  it("slows thinking delivery", () => {
    const thinking = resolveCompanionTtsProsody({
      emotion: "thinking",
      nuance: "curious",
      talkStyle: "thinking",
      speechEnergy: 0.3,
      text: "嗯…等我諗諗…",
    });
    const rate = Number(thinking.edge.rate.replace(/[^0-9-]/g, ""));
    expect(rate).toBeLessThan(6);
    expect(thinking.browser.rate).toBeLessThan(1);
  });

  it("raises pitch on questions", () => {
    const statement = resolveCompanionTtsProsody({
      emotion: "neutral",
      text: "我知呀。",
    });
    const question = resolveCompanionTtsProsody({
      emotion: "neutral",
      talkStyle: "question",
      text: "你係咪想知呀？",
    });
    expect(question.browser.pitch).toBeGreaterThan(statement.browser.pitch);
    expect(question.browser.rate).toBeGreaterThanOrEqual(statement.browser.rate);
  });

  it("builds structured instruct lines for Cantonese", () => {
    const instruct = buildTtsInstruct({
      emotion: "happy",
      nuance: "excited",
      lang: "yue",
      text: "你好呀！",
    });
    expect(instruct).toContain("Voice Affect:");
    expect(instruct).toMatch(/咬字清楚|唔好平平淡淡/);
  });

  it("normalizes legacy emotion string", () => {
    const perf = normalizeTtsPerformance("happy");
    expect(perf.emotion).toBe("happy");
    expect(perf.nuance).toBe("excited");
    expect(perf.talkStyle).toBe("celebrate");
    expect(perf.speechEnergy).toBeGreaterThan(0.55);
    expect(perf.speechEnergy).toBeLessThan(0.75);
  });

  it("resolves per-chunk performance from text", () => {
    const chunk = resolveChunkTtsPerformance("哈哈好開心呀！", {
      emotion: "happy",
    });
    expect(chunk.emotion).toBeTruthy();
    expect(chunk.prosody.edge.rate).toMatch(/^[+-]\d+%$/);
    expect(chunk.speechEnergy).toBeGreaterThan(0.4);
  });

  it("defaults to a single full-sentence utterance", () => {
    const perf = normalizeTtsPerformance({ emotion: "happy" });
    expect(perf.singleUtterance).toBe(true);
    expect(perf.expressiveClauses).toBe(false);
    expect(perf.nuance).toBe("excited");
  });

  it("lifts spoken emotion from an excited line even when the caller is calm", () => {
    expect(inferSpeechEmotionFromText("哇！真係好開心呀！")).toBe("happy");
    expect(inferSpeechEmotionFromText("今日天氣幾好")).toBe("neutral");
    const enriched = enrichTtsPerformance({ emotion: "neutral" }, "哈哈好開心呀！");
    expect(enriched.emotion).toBe("happy");
    expect(enriched.nuance).toBe("excited");
  });

  it("keeps ChatGPT Advanced Voice instructions alive on calm lines", () => {
    const instruct = buildTtsInstruct({
      emotion: "neutral",
      lang: "en",
      text: "Sure, I can help with that.",
    });
    expect(instruct).toMatch(/ChatGPT Advanced Voice/i);
    expect(instruct).toMatch(/Never:/i);
    expect(instruct).toMatch(/Speak at 0\.5x|SLOW|慢速/);
    expect(
      instructSpeakingSpeed({ emotion: "happy", speechEnergy: 0.85, speedMultiplier: 1 }),
    ).toBeGreaterThan(
      instructSpeakingSpeed({ emotion: "sad", speechEnergy: 0.4, speedMultiplier: 1 }),
    );
  });

  it("sends instructions on the cloud TTS body", () => {
    const body = buildCloudTtsRequestBody({
      text: "你好呀！",
      performance: { emotion: "neutral" },
      voice: "zh-HK-HiuMaanNeural",
      lang: "zh-HK",
      characterId: "amoji",
    });
    expect(body.emotion).toBe("happy");
    expect(body.instructions).toContain("Voice Affect:");
    expect(body.instructions).toMatch(/Speak at |慢速講|0\.\d+x/);
    expect(body.speedMultiplier).toBe(0.5);
    expect(body.speed).toBeLessThan(0.75);
  });

  it("ignores expressiveClauses unless singleUtterance is explicitly off", () => {
    const ignored = normalizeTtsPerformance({
      emotion: "happy",
      expressiveClauses: true,
    });
    expect(ignored.singleUtterance).toBe(true);
    expect(ignored.expressiveClauses).toBe(false);
  });

  it("allows clause-level TTS when singleUtterance is off", () => {
    const perf = normalizeTtsPerformance({
      emotion: "happy",
      singleUtterance: false,
      expressiveClauses: true,
    });
    expect(perf.singleUtterance).toBe(false);
    expect(perf.expressiveClauses).toBe(true);
  });

  it("maps [mood] tags from LLM reply to voice performance", () => {
    const happy = resolveVoicePerformanceFromReply(
      "哇好開心呀！ [mood:happy]",
      { isEnglish: false, characterId: "amoji" },
    );
    const sad = resolveVoicePerformanceFromReply(
      "我陪住你… [mood:sad] [nuance:stress]",
      { userText: "今日好唔開心", isEnglish: false },
    );
    expect(happy.emotion).toBe("happy");
    expect(happy.nuance).toBe("excited");
    expect(happy.talkStyle).toBe("celebrate");
    expect(happy.singleUtterance).toBe(true);
    expect(happy.expressiveClauses).toBe(false);
    expect(sad.emotion).toBe("sad");
    expect(sad.nuance).toBe("stress");
    expect(sad.talkStyle).toBe("soft");
    const happyProsody = resolveCompanionTtsProsody({
      ...happy,
      text: happy.text,
      characterId: "amoji",
    });
    const sadProsody = resolveCompanionTtsProsody({
      ...sad,
      text: sad.text,
    });
    expect(happyProsody.browser.rate).toBeGreaterThan(sadProsody.browser.rate);
    expect(happyProsody.speed).toBeGreaterThan(sadProsody.speed);
    expect(happyProsody.instruct).toMatch(/delighted|開心|Smile/i);
    expect(sadProsody.instruct).toMatch(/empathy|陪|Soft/i);
  });

  it("builds voice performance from speech chunk analysis", () => {
    const analysis = analyzeSpeechChunk("哈哈好開心呀！", {
      emotion: "happy",
      nuance: "excited",
    });
    const perf = voicePerformanceFromAnalysis(analysis, {
      isEnglish: false,
      characterId: "amoji",
    });
    expect(perf.emotion).toBe("happy");
    expect(perf.expressiveClauses).toBe(false);
    expect(perf.singleUtterance).toBe(true);
    expect(perf.lang).toBe("yue");
  });
});
