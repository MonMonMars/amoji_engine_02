import { describe, expect, it } from "vitest";
import {
  DIALECT_PREF_SCHEMA,
  nextDialectMode,
  normalizeDialectMode,
  persistDialectPref,
  resolveDialectPref,
} from "../engine/lab/dialectPref.js";
import { detectLanguage } from "../engine/voice/dialect.js";
import { createVoiceWorkerClient } from "../engine/voice/voiceWorkerClient.js";
import { createVoiceRobotBridge } from "../engine/voice/voiceRobotBridge.js";

describe("dialectPref + force lock", () => {
  it("normalizes and cycles modes", () => {
    expect(normalizeDialectMode("cantonese")).toBe("yue");
    expect(normalizeDialectMode("EN")).toBe("en");
    expect(normalizeDialectMode("detect")).toBe("auto");
    expect(nextDialectMode("auto")).toBe("yue");
    expect(nextDialectMode("yue")).toBe("en");
    expect(nextDialectMode("en")).toBe("auto");
  });

  it("resolves from query over storage", () => {
    const memory = new Map([["amoji.dialectPref", "en"]]);
    const storage = {
      getItem: (k) => (memory.has(k) ? memory.get(k) : null),
      setItem: (k, v) => memory.set(k, String(v)),
    };
    const pref = resolveDialectPref({
      search: "?lang=yue",
      storage,
      env: {},
    });
    expect(pref.schema).toBe(DIALECT_PREF_SCHEMA);
    expect(pref.mode).toBe("yue");
    expect(pref.forceLanguage).toBe("yue");
    expect(pref.source).toBe("query");
    expect(memory.get("amoji.dialectPref")).toBe("yue");

    const persisted = persistDialectPref("en", { storage });
    expect(persisted.forceLanguage).toBe("en");
    expect(memory.get("amoji.dialectPref")).toBe("en");
  });

  it("detectLanguage honors force over SenseVoice tags", () => {
    const forced = detectLanguage(
      { asrRaw: "<|en|><|Speech|>Hello there" },
      { sticky: "yue", force: "yue" },
    );
    expect(forced.id).toBe("yue");
    expect(forced.source).toBe("forced");
  });

  it("worker + robot forceLanguage lock English tags to yue", async () => {
    const worker = createVoiceWorkerClient({
      mode: "mock",
      language: "yue",
      forceLanguage: "yue",
    });
    const asr = await worker.asr({
      text: "<|en|><|NEUTRAL|><|Speech|>Hello there friend",
    });
    expect(asr.language).toBe("yue");
    expect(asr.dialect.source).toBe("forced");

    const robot = createVoiceRobotBridge({
      language: "yue",
      forceLanguage: "yue",
    });
    const turn = await robot.runTurn(
      "<|en|><|Speech|>Hello there, how are you today?",
    );
    expect(turn.language).toBe("yue");
    expect(robot.language).toBe("yue");

    worker.setForceLanguage(null);
    robot.setForceLanguage("en");
    const unlocked = await worker.asr({
      text: "<|en|><|Speech|>Hello again",
    });
    expect(unlocked.language).toBe("en");
    const enTurn = await robot.runTurn("<|yue|><|Speech|>早晨");
    expect(enTurn.language).toBe("en");
  });
});
