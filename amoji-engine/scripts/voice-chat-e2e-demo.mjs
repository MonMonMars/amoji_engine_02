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

  robot.setForceLanguage("yue");
  const locked = await robot.runTurn(
    "<|en|><|Speech|>Hello again, please stay Cantonese",
  );
  assert(locked.language === "yue", `force lock expected yue got ${locked.language}`);
  console.log("[e2e] dialect force lock ok →", locked.language);
}

console.log("[e2e] listen pref + TTS mute…");
{
  const {
    resolveListenPref,
    nextListenSensitivity,
    createTtsPlaybackQueue,
  } = await import("../engine/index.js");
  const pref = resolveListenPref({ search: "?vad=low", storage: null, env: {} });
  assert(pref.sensitivity === "low", "vad low");
  assert(pref.vad.energyThreshold > 0.03, "low thr");
  assert(nextListenSensitivity("low") === "high", "vad cycle");
  const player = createTtsPlaybackQueue({ offline: true });
  assert(player.setMuted(true) === true, "mute");
  await player.enqueue({ index: 0, durationSec: 0.05, text: "x" });
  assert(player.playedCount === 0, "muted skips play");
  console.log("[e2e] listen/mute ok →", pref.sensitivity, pref.vad.energyThreshold);
}

console.log("[e2e] push-to-talk hold…");
{
  const { createPushToTalk } = await import("../engine/index.js");
  let t = 0;
  const startListening = async () => {};
  const stopListeningAndTalk = async () => {};
  const ptt = createPushToTalk({
    startListening,
    stopListeningAndTalk,
    minHoldMs: 50,
    nowMs: () => t,
  });
  assert((await ptt.press()) === true, "ptt press");
  t += 80;
  assert((await ptt.release()) === "talked", "ptt release");
  console.log("[e2e] ptt ok → talked");
}

console.log("[e2e] hotkeys + latency budget…");
{
  const {
    checkLatencyBudget,
    formatLatencyBudget,
    createLabHotkeys,
  } = await import("../engine/index.js");
  const ok = checkLatencyBudget({
    asrMs: 10,
    robotMs: 10,
    ttsMs: 10,
    totalMs: 30,
  });
  assert(ok.ok === true, "budget ok");
  const miss = checkLatencyBudget(
    { asrMs: 10, robotMs: 10, ttsMs: 10, totalMs: 99999 },
    { totalMs: 100 },
  );
  assert(miss.ok === false, "budget miss");
  assert(/miss/.test(formatLatencyBudget(miss)), "budget format");
  const listeners = new Map();
  const hotkeys = createLabHotkeys({
    target: {
      addEventListener: (t, cb) => listeners.set(t, cb),
      removeEventListener: (t) => listeners.delete(t),
    },
    onBarge: () => {},
  });
  assert(hotkeys.bind() === true, "hotkeys bind");
  assert(hotkeys.unbind() === true, "hotkeys unbind");
  console.log("[e2e] hotkeys/budget ok →", formatLatencyBudget(ok));
}

console.log("[e2e] infer expression + metrics export…");
{
  const {
    inferExpressionFromText,
    resolveExpressionFromTurn,
    createTurnMetricsRollup,
    exportTurnMetricsRollup,
    buildLabShareUrl,
    copyTextToClipboard,
  } = await import("../engine/index.js");
  assert(inferExpressionFromText("哈哈好開心呀") === "happy", "infer happy");
  assert(
    resolveExpressionFromTurn({ text: "唉傷心" }).expression === "sad",
    "resolve sad",
  );
  const rollup = createTurnMetricsRollup();
  rollup.push({ asrMs: 1, robotMs: 1, ttsMs: 1, totalMs: 3 });
  const { payload } = exportTurnMetricsRollup(rollup, { download: false });
  assert(payload.kind === "amoji-turn-metrics-rollup", "metrics kind");
  const share = buildLabShareUrl({
    href: "http://127.0.0.1:5173/prototypes/realtime-voice-lab.html",
    lang: "yue",
    vad: "high",
  });
  assert(share.includes("lang=yue"), "share url");
  const copied = await copyTextToClipboard(share, {
    clipboard: { writeText: async () => {} },
  });
  assert(copied.ok === true, "clipboard ok");
  console.log("[e2e] infer/export ok →", payload.summary.count, share.slice(0, 48));
}

console.log("[e2e] mic level meter…");
{
  const { createMicLevelMeter } = await import("../engine/index.js");
  const meter = createMicLevelMeter({ alpha: 1, threshold: 0.05 });
  const silent = new Int16Array(480);
  const loud = new Int16Array(480).fill(12_000);
  assert(meter.push(silent).over === false, "quiet");
  assert(meter.push(loud).over === true, "speech");
  assert(/SPEECH/.test(meter.formatHud()), "hud speech");
  console.log("[e2e] mic meter ok →", meter.formatHud());
}

console.log("[e2e] tts volume pref…");
{
  const {
    resolveTtsVolumePref,
    nextTtsVolume,
    createTtsPlaybackQueue,
  } = await import("../engine/index.js");
  const pref = resolveTtsVolumePref({ search: "?vol=loud", storage: null, env: {} });
  assert(pref.level === "loud", "vol loud");
  assert(pref.gain > 1, "loud gain");
  assert(nextTtsVolume("loud") === "soft", "vol cycle");
  const player = createTtsPlaybackQueue({ offline: true, gain: pref.gain });
  assert(player.setGain(0.5) === 0.5, "setGain");
  console.log("[e2e] tts volume ok →", pref.level, pref.gain);
}

console.log("[e2e] idle presence smoke…");
{
  const { createIdlePresenceClock, sampleIdlePresence, presenceToFaceLiveParams } =
    await import("../engine/face/idlePresence.js");
  const a = sampleIdlePresence(0.5);
  const b = sampleIdlePresence(1.5);
  assert(a.speechActive === false, "idle not speaking");
  assert(a.lookX !== b.lookX, "look should drift");
  const clock = createIdlePresenceClock({ emotion: "neutral" });
  const before = clock.timeSec;
  clock.step(0.05);
  assert(clock.timeSec > before, "clock should advance");
  const params = presenceToFaceLiveParams(a);
  assert(params.some((p) => p.id === "ParamMouthOpenY"), "face params mouth");
  assert(params.some((p) => p.id === "ParamAngleX"), "face params look");
  console.log("[e2e] idle presence ok →", clock.timeSec.toFixed(3), "params", params.length);
}

console.log("[e2e] prosody markers…");
{
  const robot = createVoiceRobotBridge({ language: "yue" });
  const turn = await robot.runTurn("prosody", {
    forceReply: "好呀[pause:0.4]，我[slow]慢慢講，跟住[fast][bright]開心！",
  });
  assert(turn.reply === "好呀，我慢慢講，跟住開心！", `reply=${turn.reply}`);
  assert(turn.prosody?.markers?.length >= 3, "expected markers");
  assert(turn.prosody.pauseMs >= 400, `pause=${turn.prosody.pauseMs}`);
  console.log(
    "[e2e] prosody ok → pause",
    turn.prosody.pauseMs,
    "speed",
    turn.prosody.speed,
  );
}

console.log("[e2e] barge during speak delay…");
{
  const { createAlwaysOnListen } = await import(
    "../engine/voice/alwaysOnListen.js"
  );
  let frameCb = null;
  const mic = {
    onFrame: (cb) => {
      frameCb = cb;
      return () => {
        frameCb = null;
      };
    },
  };
  const robot = createVoiceRobotBridge();
  let barged = false;
  const controller = createAlwaysOnListen({
    mic,
    startListening: async () => {},
    stopListeningAndTalk: async () => {
      const turn = robot.runTurn("你好", { speakMs: 400, tickMs: 20 });
      await new Promise((r) => setTimeout(r, 30));
      frameCb(loud(20));
      frameCb(loud(20));
      frameCb(loud(20));
      frameCb(loud(20));
      frameCb(loud(20));
      const result = await turn;
      barged = Boolean(result.barged);
    },
    energyThreshold: 0.05,
    minSpeechMs: 20,
    trailingSilenceMs: 40,
    sampleRateHz: 1000,
    frameSamples: 20,
    bargeEnergyThreshold: 0.05,
    bargeMinSpeechMs: 40,
    onBargeIn: async () => {
      robot.abort("e2e-barge");
    },
  });
  await controller.start();
  frameCb(loud(20));
  frameCb(loud(20));
  frameCb(silent(20));
  frameCb(silent(20));
  await new Promise((r) => setTimeout(r, 500));
  assert(barged === true, "expected barged speak turn");
  await controller.stop();
  console.log("[e2e] barge during talk ok");
}

console.log("[e2e] SenseVoice / CosyVoice worker mock…");
{
  const { createVoiceWorkerClient, parseSenseVoiceTranscript } = await import(
    "../engine/index.js"
  );
  const parsed = parseSenseVoiceTranscript(
    "<|yue|><|HAPPY|><|Speech|>今日好開心呀",
  );
  assert(parsed.language === "yue", "sensevoice lang");
  assert(parsed.serEmotion === "happy", "sensevoice ser");
  const worker = createVoiceWorkerClient({ mode: "mock" });
  const turn = await worker.runTurn({
    text: "<|yue|><|HAPPY|><|Speech|>今日天氣好正呀",
  });
  assert(turn.asr.emotion.emotion === "happy", "worker emotion");
  assert(turn.tts.chunkCount >= 1, "worker tts chunks");
  assert(turn.reply, "worker reply");
  console.log(
    "[e2e] worker ok →",
    turn.language,
    turn.emotion.emotion,
    "chunks",
    turn.tts.chunkCount,
  );
}

console.log("[e2e] worker↔robot pipeline + mic buffer…");
{
  const {
    createVoiceWorkerClient,
    createVoiceRobotBridge,
    createWorkerTurnHost,
    createTurnMetricsRollup,
    runWorkerRobotTurn,
  } = await import("../engine/index.js");
  const worker = createVoiceWorkerClient({ mode: "mock" });
  const health = await worker.health();
  assert(health.ok === true, "mock worker health");
  const robot = createVoiceRobotBridge();
  const rollup = createTurnMetricsRollup();
  const piped = await runWorkerRobotTurn({
    worker,
    robot,
    text: "<|yue|><|HAPPY|><|Speech|>我叫小明",
  });
  assert(robot.memory.userName === "小明", "pipeline should teach robot name");
  assert(piped.tts.chunkCount >= 1, "pipeline tts");
  assert(piped.metrics?.totalMs >= 0, "pipeline metrics");
  assert(piped.metrics?.chunkCount >= 1, "metrics chunks");
  rollup.push(piped.metrics);

  const host = createWorkerTurnHost({ worker, robot, inputRate: 16000 });
  host.beginListen();
  const frame = new Float32Array(800).fill(0.15);
  for (let i = 0; i < 25; i += 1) host.pushFrame(frame);
  const fromMic = await host.runFromBuffer();
  assert(fromMic.asr.text, "mic buffer asr text");
  assert(fromMic.reply, "mic buffer reply");
  rollup.push(fromMic.metrics);
  assert(rollup.length === 2, "metrics rollup count");
  assert(rollup.summary().totalMs.p50 != null, "rollup p50");
  console.log(
    "[e2e] pipeline ok →",
    piped.asr.text,
    "→",
    fromMic.asr.text,
    "chunks",
    fromMic.tts.chunkCount,
    "rollup",
    rollup.formatHud(),
  );
}

console.log("[e2e] TTS playback queue (offline)…");
{
  const { createTtsPlaybackQueue, mockTtsStream, base64ToBytes } = await import(
    "../engine/index.js"
  );
  const tts = await mockTtsStream({ text: "測試播放", language: "yue" });
  assert(tts.chunks[0].pcmBase64, "pcm missing");
  const head = base64ToBytes(tts.chunks[0].pcmBase64).subarray(0, 4);
  assert(
    String.fromCharCode(...head) === "RIFF",
    "expected RIFF wav",
  );
  const player = createTtsPlaybackQueue({ offline: true });
  let started = 0;
  player.onStart = () => {
    started += 1;
  };
  await player.enqueueAll(
    tts.chunks.map((c) => ({ ...c, durationSec: 0.04, pauseMs: 0 })),
  );
  assert(started >= 1, "playback should start");
  assert(player.playedCount >= 1, "playback should finish at least one");
  player.flush();
  console.log("[e2e] tts playback ok → played", player.playedCount);
}

console.log("[e2e] lip-sync from TTS chunks…");
{
  const {
    createLipSyncTracker,
    createTtsPlaybackQueue,
    mockTtsStream,
    resolveVoiceWorkerConfig,
  } = await import("../engine/index.js");
  const tts = await mockTtsStream({ text: "開心呀", language: "yue" });
  const lipSync = createLipSyncTracker();
  const mouths = [];
  const player = createTtsPlaybackQueue({
    offline: true,
    lipSync,
    onLipSync: ({ mouthOpen }) => mouths.push(mouthOpen),
  });
  await player.enqueueAll(
    tts.chunks.map((c) => ({ ...c, durationSec: 0.04, pauseMs: 0 })),
  );
  assert(mouths.length >= 1, "expected lip-sync events");
  assert(mouths.some((m) => m > 0), "expected open mouth");
  const cfg = resolveVoiceWorkerConfig({
    search: "?worker=http://127.0.0.1:7890",
    storage: null,
    env: {},
  });
  assert(cfg.mode === "http", "worker url resolve");
  console.log("[e2e] lipsync ok → events", mouths.length, "max", Math.max(...mouths));
}

console.log("[e2e] Face Live client smoke…");
{
  const {
    startMockFaceLiveBridge,
    createSakuraFaceLiveClient,
    presenceToFaceLiveParams,
    sampleIdlePresence,
    mapEmotionToExpression,
    nextExpressionPreset,
    expressionParamsForEmotion,
  } = await import("../engine/index.js");
  assert(mapEmotionToExpression("joy") === "happy", "emotion map joy");
  assert(nextExpressionPreset("angry") === "neutral", "expression cycle");
  assert(
    expressionParamsForEmotion("surprised").parameters.length >= 1,
    "surprised params",
  );
  const bridge = await startMockFaceLiveBridge();
  const client = createSakuraFaceLiveClient({
    url: bridge.url,
    authTimeoutMs: 3000,
  });
  await client.connect();
  assert(client.isAuthenticated, "facelive auth");
  client.setExpression(mapEmotionToExpression("HAPPY"));
  client.injectParameters(presenceToFaceLiveParams(sampleIdlePresence(0.5)));
  await new Promise((r) => setTimeout(r, 30));
  assert(bridge.injected.length >= 1, "facelive inject");
  assert(client.expression === "happy", "facelive expression");
  client.disconnect();
  await bridge.close();
  console.log(
    "[e2e] facelive ok → injects",
    bridge.injected.length,
    "expr",
    client.expression,
  );
}

console.log("[e2e] all checks passed");
