# Realtime voice lab

Prototype UI: [`../../prototypes/realtime-voice-lab.html`](../../prototypes/realtime-voice-lab.html)

Serve the **repository root** (not only `amoji-engine/`) so imports like `../amoji-engine/engine/` resolve.

## What it exercises

| Piece | Module |
| --- | --- |
| Always-on energy VAD | `engine/voice/alwaysOnListen.js` |
| Push-to-talk hold | `engine/voice/pushToTalk.js` |
| Mic → ASR → robot → TTS | `engine/voice/workerTurnPipeline.js` |
| SenseVoice / CosyVoice client | `engine/voice/voiceWorkerClient.js` |
| TTS WAV playback + barge flush | `engine/voice/browserAudio.js` |
| Lip-sync RMS → Live2D | `engine/face/lipSyncFromChunk.js` |
| Idle presence morphs | `engine/face/idlePresence.js` |
| Face Live WS inject | `engine/face/sakuraFaceLiveClient.js` |
| Emotion → expression | `engine/face/emotionExpression.js` (`inferExpressionFromText`) |
| Disney talk gestures | `engine/face/talkGestures.js` (body / hands / fingers from reply text) |
| Multi-vendor robot motion | `engine/robot/talkMotion.js` (SoftBank / Furhat / Reachy / Unitree / ROS) |
| Session archive | `engine/lab/sessionArchive.js` |
| Clipboard / share URL | `engine/lab/clipboard.js` |
| Turn latency rollup | `engine/lab/turnMetricsRollup.js` |
| Dialect preference | `engine/lab/dialectPref.js` |
| VAD sensitivity | `engine/lab/listenPref.js` |
| TTS volume | `engine/lab/ttsVolumePref.js` |
| Mic level meter | `engine/lab/micLevelMeter.js` |
| Lab hotkeys | `engine/lab/labHotkeys.js` |
| Latency budget | `engine/lab/latencyBudget.js` |

## Controls

1. **Always-on** — mic permission, VAD loop, worker pipeline turns, partial ASR emotion prefires.
2. **Hold to talk** — press-and-hold mic capture → release runs the worker pipeline (turn Always-on off first). Also **Space**.
3. **Ready check** — probe worker `health()` and log current lab URL / dialect / VAD.
4. **Worker demo** — one tagged SenseVoice stub → robot reply → CosyVoice-style chunks + playback.
5. **Face Live** — connect to `?face=` URL; idle (~10 Hz) + lip-sync injects while talking.
6. **Dialect** — cycle Auto → Yue → En (`?lang=` / `amoji.dialectPref`); force lock skips SenseVoice tag auto-switch.
7. **VAD** — cycle High → Normal → Low (`?vad=` / `amoji.listenPref`); hot-updates thresholds while listening. Live **mic** HUD shows smoothed RMS vs threshold (`SPEECH` / `quiet`).
8. **TTS mute** — silence CosyVoice playback (pipeline + lip-sync ticks still run when unmuted chunks arrive). Also **M**.
9. **TTS volume** — Soft → Normal → Loud (`?vol=` / `amoji.ttsVolume`); GainNode when available. Also **[** / **]**.
10. **Expression demo** — cycle Sakura presets (`neutral → happy → thinking → surprised → sad → angry`); injects when Face Live is on. Also **E**.
11. **Gesture demo** — cycle Disney-style talk styles (`explain → point → emphasize → …`); reply text also picks a style via `inferTalkGestureFromText`. Merges hand/shoulder/body + **per-joint fingers (Prox→Mid→Tip)** with lip-sync while speaking. Also **G**.
12. **Motion vendor** — cycle Sakura → SoftBank → Furhat → Reachy → Unitree G1 → ROS. Maps the same talk style onto each company's open gesture/joint envelope (see [Robot motion vendors](./ROBOT_MOTION_VENDORS.md)). Optional `?motionBridge=` forwards packages to the HTTP motion bridge (`npm run motion-bridge:mock`).
13. **Motion demo** — cycle talk styles (`explain → point → …`) into the active vendor package and POST begin/frames to the motion bridge. SoftBank includes `^start(...)` `annotatedReply` on begin. Also **V**.
14. **Prosody demo** / **Barge-in** — marker text / abort + TTS flush. Barge also **Esc**.
15. **Export / Import Session** — JSON archive of chat + ticks + turn metrics rollup (p50/p95) + motion dispatch log.
16. **Export Metrics** — download turn metrics rollup only.
17. **Copy lab URL** — clipboard share link with `worker` / `face` / `lang` / `vad` / `vol` / `motion` / `motionBridge` query prefs.

Robot HUD shows expression, **gesture**, **motion** (vendor package), partial ASR text, VAD sensitivity, last-turn latency, rollup, and a soft **budget** line (default Σ ≤ 3500ms).

Reply text also drives Face Live via `inferExpressionFromText` / `resolveExpressionFromTurn` when SER emotion is missing, and talk gestures via `inferTalkGestureFromText` (point / question / celebrate / count / shrug / wave / …).

Hand / shoulder / finger parameter ids (`ParamHandRPoint`, `ParamFingerRIndexTip`, `ParamFingerRIndexMid`, `ParamFingerRIndexProx`, `ParamShoulderL`, …) are custom inject names — map them in VTube Studio / Live2D if the Sakura model does not expose them. Each digit has Prox → Mid → **Tip** (fingertip).

### Keyboard

| Key | Action |
| --- | --- |
| `Space` | Hold-to-talk (same as PTT button) |
| `Esc` | Barge-in |
| `M` | Toggle TTS mute |
| `E` | Cycle expression preset |
| `G` | Cycle talk gesture style |
| `V` | Cycle robot motion style (vendor package → bridge) |
| `[` / `]` | TTS volume down / up |

Ignored while focus is in an input / textarea.

## URL / env

| Key | Example |
| --- | --- |
| `?worker=` / `AMOJI_VOICE_WORKER` | `http://127.0.0.1:7890` |
| `?face=` / `AMOJI_FACE_LIVE_URL` | `ws://127.0.0.1:8765` |
| `?lang=` / `AMOJI_DIALECT` | `auto` · `yue` · `en` |
| `?vad=` / `AMOJI_VAD` | `high` · `normal` · `low` |
| `?vol=` / `AMOJI_TTS_VOLUME` | `soft` · `normal` · `loud` |
| `?motion=` / `AMOJI_MOTION_VENDOR` | `sakura` · `softbank` · `furhat` · `reachy` · `unitree_g1` · `ros` |
| `?motionBridge=` / `AMOJI_MOTION_BRIDGE` | HTTP motion bridge base URL (mock `:7891`) |

Persisted in `localStorage` as `amoji.voiceWorkerUrl` / `amoji.faceLiveUrl` / `amoji.dialectPref` / `amoji.listenPref` / `amoji.ttsVolume` / `amoji.motionVendor` / `amoji.motionBridgeUrl`.

## Local stubs

```bash
cd amoji-engine
npm run voice-worker:mock      # HTTP ASR/TTS on :7890
npm run lab                    # static server → realtime-voice-lab.html
npm run demo:facelive-smoke    # JS client ↔ mock Face Live bridge
npm run motion-bridge:mock     # HTTP robot motion bridge on :7891
npm run demo:motion-smoke      # SoftBank / Reachy / Unitree → mock bridge
npm run demo:http-smoke        # worker HTTP client smoke
```

`npm run lab` serves the **repo root** on `http://127.0.0.1:5173` (override with `--port`).

Point a real VTube Studio API at `?face=ws://127.0.0.1:8001` after enabling the plugin API.

See also [Voice worker](./VOICE_WORKER.md), [Session & presence](./SESSION_AND_PRESENCE.md).
