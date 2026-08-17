# Realtime voice lab

Prototype UI: [`../../prototypes/realtime-voice-lab.html`](../../prototypes/realtime-voice-lab.html)

Serve the **repository root** (not only `amoji-engine/`) so imports like `../amoji-engine/engine/` resolve.

## What it exercises

| Piece | Module |
| --- | --- |
| Always-on energy VAD | `engine/voice/alwaysOnListen.js` |
| Mic → ASR → robot → TTS | `engine/voice/workerTurnPipeline.js` |
| SenseVoice / CosyVoice client | `engine/voice/voiceWorkerClient.js` |
| TTS WAV playback + barge flush | `engine/voice/browserAudio.js` |
| Lip-sync RMS → Live2D | `engine/face/lipSyncFromChunk.js` |
| Idle presence morphs | `engine/face/idlePresence.js` |
| Face Live WS inject | `engine/face/sakuraFaceLiveClient.js` |
| Session archive | `engine/lab/sessionArchive.js` |
| Turn latency rollup | `engine/lab/turnMetricsRollup.js` |
| Dialect preference | `engine/lab/dialectPref.js` |

## Controls

1. **Always-on** — mic permission, VAD loop, worker pipeline turns, partial ASR emotion prefires.
2. **Worker demo** — one tagged SenseVoice stub → robot reply → CosyVoice-style chunks + playback.
3. **Face Live** — connect to `?face=` URL; idle (~10 Hz) + lip-sync injects while talking.
4. **Dialect** — cycle Auto → Yue → En (`?lang=` / `amoji.dialectPref`); force lock skips SenseVoice tag auto-switch.
5. **Prosody demo** / **Barge-in** — marker text / abort + TTS flush.
6. **Export / Import Session** — JSON archive of chat + ticks + turn metrics rollup (p50/p95).

Robot HUD shows last-turn latency and a rolling **rollup** line (`n=… Σ p50 · p95 · μ`).

## URL / env

| Key | Example |
| --- | --- |
| `?worker=` / `AMOJI_VOICE_WORKER` | `http://127.0.0.1:7890` |
| `?face=` / `AMOJI_FACE_LIVE_URL` | `ws://127.0.0.1:8765` |
| `?lang=` / `AMOJI_DIALECT` | `auto` · `yue` · `en` |

Persisted in `localStorage` as `amoji.voiceWorkerUrl` / `amoji.faceLiveUrl` / `amoji.dialectPref`.

## Local stubs

```bash
cd amoji-engine
npm run voice-worker:mock      # HTTP ASR/TTS on :7890
npm run demo:facelive-smoke    # JS client ↔ mock Face Live bridge
npm run demo:http-smoke        # worker HTTP client smoke
```

Point a real VTube Studio API at `?face=ws://127.0.0.1:8001` after enabling the plugin API.

See also [Voice worker](./VOICE_WORKER.md), [Session & presence](./SESSION_AND_PRESENCE.md).
