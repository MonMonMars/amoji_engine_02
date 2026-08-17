# Session & presence (lab)

## Session archive (realtime voice lab)

The lab façade in `engine/lab/sessionArchive.js` keeps:

| Piece | Role |
| --- | --- |
| `labChat` | Persistent chat log (optional `localStorage`) |
| `tickRecorder` | Relative-time event ticks (VAD, phase, connect, export/import) |
| `exportSessionArchive` | Build JSON + optional browser **download** |
| `importSessionArchive` | Restore from **file input** / Blob / string / object |

Archive shape:

```json
{
  "schemaVersion": 1,
  "kind": "amoji-realtime-voice-lab-session",
  "exportedAt": "…",
  "meta": { "lab": "realtime-voice-lab" },
  "chat": { "messages": [/* … */] },
  "ticks": { "startedAt": 0, "ticks": [/* … */] }
}
```

Prototype UI: [`../../prototypes/realtime-voice-lab.html`](../../prototypes/realtime-voice-lab.html) — **Export Session** / **Import Session**.

```js
import { createLabSessionFacade } from "@amoji/engine/engine";

const session = createLabSessionFacade({ storageKey: "amoji.realtimeVoiceLab.session" });
session.appendChat({ role: "user", text: "你好" });
session.exportSessionArchive({ download: true });
await session.importSessionArchive(fileFromInput);
```

See also [VoiceChatOrchestrator](./VOICE_CHAT_ORCHESTRATOR.md) for always-on listen wiring.

## Lab idle presence

While the lab host is not talking, an `IdlePresenceClock` rAF loop updates the Robot HUD **idle** row (breath / jaw / blink) and maps morphs to Face Live inject params via `presenceToFaceLiveParams` (jaw → `ParamMouthOpenY`, blink → eye open, look → angle).

```js
import {
  createIdlePresenceClock,
  presenceToFaceLiveParams,
} from "@amoji/engine/engine";
const idle = createIdlePresenceClock({ emotion: "neutral" });
// each rAF while !talking:
const presence = idle.step(dt);
const params = presenceToFaceLiveParams(presence);
// faceLive.driveIdlePresence(presence) — or inject params directly
```

TypeScript: `SakuraFaceLiveDriver.driveIdlePresence(presence)` uses the same mapping.

## Dialect auto-switch

`detectLanguage()` reads SenseVoice tags (`<|yue|>`, `<|en|>`, …) and Latin/Cantonese heuristics. The robot bridge sticky-switches language per `runTurn` and returns English or 粵語 stub replies accordingly.

## Prosody markers

Inline markers in reply text: `[pause]`, `[pause:0.5]`, `[fast]`, `[slow]`, `[soft]`, `[bright]`, `[rate:1.2]`.

```js
import { prosodyFromMarkedText } from "@amoji/engine/engine";
prosodyFromMarkedText("好呀[pause]，跟住[fast]開心！", { language: "yue" });
```

Lab: **Prosody demo** / **Barge-in** on `prototypes/realtime-voice-lab.html`.

## Barge-in during TTS

Always-on listen keeps mic frames flowing while `stopListeningAndTalk` is busy. Sustained energy above `bargeEnergyThreshold` for `bargeMinSpeechMs` fires `onBargeIn` so the host can `robot.abort()` / cancel TTS.

```js
createAlwaysOnListen({
  mic,
  startListening,
  stopListeningAndTalk,
  bargeDuringTalk: true,
  bargeEnergyThreshold: 0.04,
  bargeMinSpeechMs: 100,
  onBargeIn: (info) => robot.abort("barge-in"),
});
```

`VoiceChatOrchestrator` forwards the same hooks via `opts.onBargeIn` / `orch.bargeIn()`.

## SenseVoice + CosyVoice worker

JS client: `createVoiceWorkerClient({ mode: 'mock' | 'http', workerUrl })`.

| Mode | Role |
| --- | --- |
| `mock` | Offline ASR/TTS stubs with SenseVoice-style tags |
| `http` | `POST` to `scripts/voice_bridge_server.py` (`/asr`, `/tts`, `/tts/stream`) |

```js
import { createVoiceWorkerClient } from "@amoji/engine/engine";
const worker = createVoiceWorkerClient({ mode: "mock" });
const turn = await worker.runTurn({
  text: "<|yue|><|HAPPY|><|Speech|>今日好開心呀",
});
// turn.asr.emotion · turn.tts.chunks · turn.reply
```

Python worker (optional GPU):

```bash
cd amoji-engine
# pip install fastapi uvicorn  (+ funasr / CosyVoice when ready)
npm run voice-worker   # → http://127.0.0.1:7890
export AMOJI_VOICE_WORKER=http://127.0.0.1:7890
```

Lab: **Worker demo** runs a mock SenseVoice → CosyVoice pipeline turn.
Partial ASR: `createPartialAsrWatcher` polls `/asr/partial` while the mic is open.
