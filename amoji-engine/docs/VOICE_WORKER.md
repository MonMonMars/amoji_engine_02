# SenseVoice + CosyVoice worker

Cantonese-first ASR/TTS worker path used by the realtime voice lab.

## JS client

`engine/voice/voiceWorkerClient.js` (exported from `engine/index.js`)

| API | Role |
| --- | --- |
| `createVoiceWorkerClient({ mode, workerUrl })` | Mock or HTTP façade |
| `client.asr({ text \| audioBase64 })` | SenseVoice parse + dialect + SER emotion |
| `client.tts({ text, emotion, … })` | CosyVoice-style chunk stream (prosody markers stripped) |
| `client.runTurn({ text, replyText? })` | ASR → emotion → TTS |
| `parseSenseVoiceTranscript` / `emotionFromSenseVoice` | Tag parse + SER blend |
| `createPartialAsrWatcher` | Interim ASR while mic is open |
| `createMicFrameBuffer` / `createWorkerTurnHost` | Buffer mic → ASR → robot → TTS |
| `runWorkerRobotTurn` | One-shot pipeline turn |

## Always-on integration

Lab always-on listen feeds `turnHost.pushFrame` in parallel with VAD. On end-of-utterance, `useWorker: true` runs `turnHost.runFromBuffer()` so each spoken turn goes through SenseVoice (mock/HTTP) and CosyVoice TTS chunks before the next listen loop.

## Python worker

`scripts/voice_bridge_server.py`

| Endpoint | Role |
| --- | --- |
| `GET /health` | Ready flags for ASR/TTS |
| `POST /asr` | SenseVoice (or text passthrough) |
| `POST /asr/partial` | Interim transcript |
| `POST /tts` | CosyVoice3 / CosyVoice2 instruct, else silent mock-wav |
| `POST /tts/stream` | NDJSON meta + chunk lines |

```bash
cd amoji-engine
pip install fastapi uvicorn pydantic   # + funasr / CosyVoice for real models
export AMOJI_COSYVOICE_PATH=/path/to/CosyVoice   # optional
npm run voice-worker
export AMOJI_VOICE_WORKER=http://127.0.0.1:7890
```

Without CosyVoice installed, `/tts` still returns mock-wav chunks so the JS client can be validated end-to-end.

## Mock HTTP worker (no Python)

```bash
npm run voice-worker:mock   # node scripts/mock-voice-worker.mjs
npm run demo:http-smoke     # spawn mock worker + ASR/TTS + playback queue
```

## TTS playback

`createTtsPlaybackQueue()` / `TtsChunkPlayer` drains WAV/`pcmBase64` chunks (Web Audio in browser; offline duration clock in Node). Barge-in calls `flush()`.

```js
const player = createTtsPlaybackQueue();
await client.tts({ text: "好呀" }, { onChunk: (c) => player.enqueue(c) });
player.flush(); // barge-in
```

