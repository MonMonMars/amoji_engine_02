# @amoji/engine

Cantonese **realtime voice chat** + **Sakura Face Live** orchestration for Amoji.

Two surfaces ship together:

| Surface | Path | Role |
| --- | --- | --- |
| **TypeScript library** | `src/` → `dist/` | OpenAI Realtime GA + Face Live driver + orchestrator |
| **JS engine + lab** | `engine/` + `../prototypes/realtime-voice-lab.html` | Always-on VAD, SenseVoice/CosyVoice worker, TTS playback, Face Live inject |

## Stack overview

```
Mic ──▶ Always-on VAD ──▶ SenseVoice ASR ──▶ Robot bridge ──▶ CosyVoice TTS
              │                                    │                │
              │                              dialect/prosody    WAV chunks
              ▼                                    ▼                ▼
         barge-in                            Sakura emotion    lip-sync RMS
                                                                   │
                                                                   ▼
                                                         Face Live (Live2D)
```

OpenAI Realtime path (TS): `VoiceBridge` → `RealtimeChatClient` → `AmojiOrchestrator` → `SakuraFaceLiveDriver`.

## Quick start

```bash
cd amoji-engine
npm install
npm test                 # 117+ tests (TS + JS engine)
npm run build
npm run typecheck
npm run demo:e2e         # offline voice/lab pipeline
npm run demo:dry         # TS mock Face Live
npm run demo:facelive-smoke
npm run demo:http-smoke  # Node mock SenseVoice/CosyVoice worker
npm run ci               # full offline matrix
```

### Prototype lab

```bash
cd amoji-engine
npm run voice-worker:mock   # optional HTTP worker on :7890
npm run lab                 # http://127.0.0.1:5173 → realtime-voice-lab.html
```

| Control | What it does |
| --- | --- |
| **Always-on** | Mic → VAD → worker ASR → robot → TTS playback + lip-sync |
| **Hold to talk** | Press-and-hold mic → release runs the same pipeline (`Space`) |
| **Worker demo** | One mock SenseVoice → CosyVoice turn |
| **Face Live** | Connect VTS-compatible WS; stream idle + mouth params |
| **Dialect / VAD / Vol** | Lock language, mic sensitivity, TTS gain |
| **Prosody / Barge-in** | Marker reply demo / abort TTS (`Esc`) |
| **Export Session / Metrics** | Download lab archive or turn latency rollup |
| **Copy lab URL** | Share link with current query prefs |

Query params (persisted to `localStorage`):

- `?worker=http://127.0.0.1:7890` — HTTP voice worker (`npm run voice-worker:mock`)
- `?face=ws://127.0.0.1:8765` — Sakura Face Live / VTube Studio API
- `?lang=auto|yue|en` — dialect force lock
- `?vad=high|normal|low` — VAD sensitivity
- `?vol=soft|normal|loud` — TTS playback gain

Hotkeys: `Space` PTT · `Esc` barge · `M` mute · `E` expression · `[`/`]` volume.
### Minimal usage (voice-only, TS)

```typescript
import { AmojiOrchestrator } from "@amoji/engine";

const engine = new AmojiOrchestrator({
  openAiApiKey: process.env.OPENAI_API_KEY!,
  voiceOnly: true,
});

engine.on("transcript", ({ role, text, final }) => {
  console.log(`[${role}${final === false ? "*" : ""}] ${text}`);
});

await engine.start();
engine.pushMicAudio(micPcm16Frame);
await engine.stop();
```

### JS engine (worker pipeline)

```js
import {
  createVoiceWorkerClient,
  createVoiceRobotBridge,
  runWorkerRobotTurn,
  createTtsPlaybackQueue,
  createLipSyncTracker,
} from "@amoji/engine/engine";

const worker = createVoiceWorkerClient({ mode: "mock" });
const robot = createVoiceRobotBridge();
const lipSync = createLipSyncTracker();
const player = createTtsPlaybackQueue({
  lipSync,
  onLipSync: ({ parameters }) => faceLive.injectParameters(parameters),
});

const turn = await runWorkerRobotTurn({
  worker,
  robot,
  text: "<|yue|><|HAPPY|><|Speech|>今日好開心呀",
  onChunk: (c) => player.enqueue(c),
});
```

## Configuration (TS orchestrator)

| Option | Default | Description |
| --- | --- | --- |
| `openAiApiKey` | — | Required for live Realtime |
| `realtimeModel` | `gpt-realtime` | Realtime model id |
| `faceLiveUrl` | `ws://127.0.0.1:8765` | Sakura Face Live WebSocket |
| `voice` | `shimmer` | OpenAI TTS voice |
| `sampleRateHz` | `24000` | PCM sample rate |
| `voiceOnly` | `false` | Skip Face Live |
| `faceLiveAuthToken` | — | Cached VTS token |

Env: `OPENAI_API_KEY`, `AMOJI_FACE_LIVE_URL`, `AMOJI_VOICE_WORKER`.

## Docs

- [Architecture](./docs/architecture.md)
- [Setup](./docs/setup.md)
- [Cantonese Realtime](./docs/cantonese-realtime.md)
- [Always-on listen](./docs/always-on-listen.md)
- [VoiceChatOrchestrator](./docs/VOICE_CHAT_ORCHESTRATOR.md)
- [Session & presence](./docs/SESSION_AND_PRESENCE.md)
- [Voice worker (SenseVoice / CosyVoice)](./docs/VOICE_WORKER.md)
- [Realtime voice lab](./docs/REALTIME_VOICE_LAB.md)
- [CI / offline validation](./docs/CI.md)
- [Changelog](./CHANGELOG.md)

## Scripts

| Command | Description |
| --- | --- |
| `npm test` | Vitest (TS + JS engine) |
| `npm run build` / `typecheck` | Compile / type-check |
| `npm run demo:e2e` | Offline end-to-end checks |
| `npm run demo:dry` | TS mock Face Live |
| `npm run demo:facelive-smoke` | JS Face Live client ↔ mock bridge |
| `npm run demo:http-smoke` | Mock HTTP voice worker |
| `npm run voice-worker:mock` | Node SenseVoice/CosyVoice stub on `:7890` |
| `npm run lab` | Static server for `prototypes/realtime-voice-lab.html` |
| `npm run ci` | Offline CI matrix (typecheck + build + test + demos) |
| `npm run voice-worker` | Python worker (FunASR / CosyVoice when installed) |
| `npm run demo` | Live Realtime session (`OPENAI_API_KEY`) |

Offline CI matrix (local / your Actions runner):

```bash
npm run typecheck && npm run build && npm test
npm run demo:e2e && npm run demo:facelive-smoke && npm run demo:http-smoke
```

## License

MIT
