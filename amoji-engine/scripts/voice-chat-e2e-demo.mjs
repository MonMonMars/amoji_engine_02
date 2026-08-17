/**
 * Voice chat end-to-end demo (no live OpenAI / mic).
 *
 * Covers: utterance detector smoke, memory turn (小明), session archive export/parse,
 * voice robot bridge sakura → lip_sync → done.
 */
import {
  createLabSessionFacade,
  createUtteranceDetector,
  createVoiceRobotBridge,
  parseSessionArchive,
} from "../engine/index.js";

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

function loud(n = 20) {
  return new Int16Array(n).fill(12_000);
}
function silent(n = 20) {
  return new Int16Array(n);
}

console.log("[e2e] utterance detector smoke…");
{
  const det = createUtteranceDetector({
    energyThreshold: 0.05,
    minSpeechMs: 20,
    trailingSilenceMs: 40,
    sampleRateHz: 1000,
    frameSamples: 20,
  });
  assert(det.pushFrame(loud()) === "speaking", "expected speaking");
  assert(det.pushFrame(loud()) === "speaking", "expected still speaking");
  assert(det.pushFrame(silent()) === "trailing", "expected trailing");
  assert(det.pushFrame(silent()) === "ended", "expected ended");
  console.log("[e2e] utterance ok →", det.state);
}

console.log("[e2e] memory turns (小明)…");
{
  const robot = createVoiceRobotBridge();
  const session = createLabSessionFacade({
    storage: null,
    storageKey: null,
    meta: { demo: "voice-chat-e2e" },
  });

  const turn1 = await robot.runTurn("我叫小明");
  session.appendChat({ role: "user", text: "我叫小明" });
  session.appendChat({ role: "assistant", text: turn1.reply });
  assert(robot.memory.userName === "小明", "should remember 小明");
  assert(/小明/.test(turn1.reply), "reply should greet 小明");

  const turn2 = await robot.runTurn("我叫咩名？");
  session.appendChat({ role: "user", text: "我叫咩名？" });
  session.appendChat({ role: "assistant", text: turn2.reply });
  assert(/小明/.test(turn2.reply), "second turn should recall 小明");
  assert(turn2.phase === "done", "robot should finish done");
  assert(turn2.steps[0]?.startsWith("recall_name:小明"), "first step recall");
  console.log("[e2e] memory ok →", turn2.reply);
}

console.log("[e2e] session archive export/parse…");
{
  const session = createLabSessionFacade({
    storage: null,
    storageKey: null,
    meta: { demo: "archive" },
  });
  session.appendChat({ role: "user", text: "我叫小明" });
  session.appendChat({ role: "assistant", text: "你好小明" });
  session.recordTick("demo", { ok: true });

  const { json, archive } = session.exportSessionArchive({ download: false });
  const parsed = parseSessionArchive(json);
  assert(parsed.kind === archive.kind, "kind mismatch");
  assert(parsed.chat.messages.length === 2, "expected 2 chat messages");
  assert(parsed.ticks.ticks.length >= 3, "expected chat+demo ticks");
  console.log(
    "[e2e] archive ok → messages=",
    parsed.chat.messages.length,
    "ticks=",
    parsed.ticks.ticks.length,
  );
}

console.log("[e2e] robot bridge events…");
{
  const seen = [];
  const robot = createVoiceRobotBridge({
    onEvent: (ev) => seen.push(ev),
  });
  robot.on("sakura", () => {});
  await robot.runTurn("哈哈多謝");
  assert(seen.join(",") === "sakura,lip_sync,done", `events=${seen}`);
  robot.abort("test");
  assert(robot.getHud().phase === "aborted", "abort phase");
  robot.reset();
  assert(robot.getHud().phase === "idle", "reset idle");
  console.log("[e2e] robot events ok →", seen.join(" → "));
}

console.log("[e2e] dialect switch yue → en…");
{
  const robot = createVoiceRobotBridge({ language: "yue" });
  const turnYue = await robot.runTurn("<|yue|><|HAPPY|><|Speech|>早晨呀");
  assert(turnYue.language === "yue", `expected yue got ${turnYue.language}`);
  const turnEn = await robot.runTurn(
    "<|en|><|NEUTRAL|><|Speech|>Hello there, how are you today?",
  );
  assert(turnEn.language === "en", `expected en got ${turnEn.language}`);
  assert(/got it|talk about/i.test(turnEn.reply), `en reply=${turnEn.reply}`);
  console.log("[e2e] dialect ok →", turnYue.language, "→", turnEn.language, turnEn.reply);
}

console.log("[e2e] idle presence smoke…");
{
  const { createIdlePresenceClock, sampleIdlePresence } = await import(
    "../engine/face/idlePresence.js"
  );
  const a = sampleIdlePresence(0.5);
  const b = sampleIdlePresence(1.5);
  assert(a.speechActive === false, "idle not speaking");
  assert(a.lookX !== b.lookX, "look should drift");
  const clock = createIdlePresenceClock({ emotion: "neutral" });
  const before = clock.timeSec;
  clock.step(0.05);
  assert(clock.timeSec > before, "clock should advance");
  console.log("[e2e] idle presence ok →", clock.timeSec.toFixed(3));
}

console.log("[e2e] all checks passed");
