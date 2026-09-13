/**
 * Voice-only / Face Live demo for the Amoji Engine stack.
 *
 * Usage:
 *   OPENAI_API_KEY=sk-... npm run demo
 *   OPENAI_API_KEY=sk-... npm run demo -- --mock-face-live
 *   npm run demo -- --dry-run   # no OpenAI; exercises framing + mock Face Live
 */
import {
  AmojiOrchestrator,
  startMockFaceLiveBridge,
  type OrchestratorPhase,
} from "../src/index.js";

async function main(): Promise<void> {
  const args = new Set(process.argv.slice(2));
  const dryRun = args.has("--dry-run");
  const useMockFaceLive = args.has("--mock-face-live") || dryRun;
  const voiceOnly = args.has("--voice-only") && !useMockFaceLive;

  let mock: Awaited<ReturnType<typeof startMockFaceLiveBridge>> | null = null;
  if (useMockFaceLive) {
    mock = await startMockFaceLiveBridge();
    console.log(`[demo] mock Face Live on ${mock.url}`);
  }

  if (dryRun) {
    await runDryDemo(mock!.url);
    await mock!.close();
    return;
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error("Set OPENAI_API_KEY or pass --dry-run");
    process.exitCode = 1;
    return;
  }

  const engine = new AmojiOrchestrator({
    openAiApiKey: apiKey,
    realtimeModel: process.env.AMOJI_REALTIME_MODEL,
    voiceOnly,
    faceLiveUrl: mock?.url ?? process.env.AMOJI_FACE_LIVE_URL,
  });

  const phases: OrchestratorPhase[] = [];
  engine.on("phase", (phase) => {
    phases.push(phase);
    console.log(`[phase] ${phase}`);
  });
  engine.on("transcript", ({ role, text, final }) => {
    console.log(`[${role}${final === false ? "*" : ""}] ${text}`);
  });
  engine.on("error", ({ source, message }) => {
    console.error(`[error:${source}] ${message}`);
  });
  engine.on("audioOut", ({ pcm16 }) => {
    console.log(`[audioOut] ${pcm16.length} samples`);
  });

  console.log("[demo] connecting…");
  await engine.start();
  console.log(
    `[demo] listening. Push silence frames for 3s then stop. (wire a real mic for live chat)`,
  );

  // Feed a few silent frames so the session stays alive without a mic.
  const silence = new Int16Array(480);
  const interval = setInterval(() => engine.pushMicAudio(silence), 20);

  await sleep(3_000);
  clearInterval(interval);
  await engine.stop();
  if (mock) await mock.close();

  console.log(`[demo] done. phases=${phases.join("→")}`);
  if (mock) {
    console.log(`[demo] face-live injections=${mock.injected.length}`);
  }
}

async function runDryDemo(faceLiveUrl: string): Promise<void> {
  const { SakuraFaceLiveDriver, VoiceBridge, inferExpressionFromText } =
    await import("../src/index.js");

  const bridge = new VoiceBridge({ frameSize: 480 });
  bridge.start();
  bridge.pushMicSamples(new Int16Array(960).fill(100));
  console.log(`[dry] mic frames sent=${bridge.getStats().framesSent}`);

  const face = new SakuraFaceLiveDriver({ url: faceLiveUrl });
  await face.connect();
  console.log(`[dry] face-live authenticated=${face.isAuthenticated}`);
  await face.setExpression(inferExpressionFromText("哈哈好開心呀"));
  await face.driveLipSync(new Int16Array(480).fill(8_000));
  await face.resetLipSync();
  face.disconnect();
  console.log("[dry] ok");
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
