# Changelog

## Unreleased — `cursor/realtime-voice-chat-0f5c`

### Added

- OpenAI Realtime GA client + Cantonese session wire format (TS)
- Sakura Face Live driver (TS) and JS lab client + mock bridge
- Always-on energy VAD, VoiceChatOrchestrator, session archive lab
- SenseVoice / CosyVoice worker client (mock + HTTP), Node mock worker, Python CosyVoice3 server
- Worker↔robot turn pipeline with mic frame buffer and partial ASR
- TTS chunk playback queue, RMS lip-sync tracker, idle presence morphs
- Dialect auto-switch, prosody markers, robot memory bridge
- Turn latency metrics (`asrMs` / `robotMs` / `ttsMs` / `totalMs`) on pipeline turns
- Turn metrics rollup (`createTurnMetricsRollup`) with p50/p95/mean in lab HUD + session export
- Worker `health()` probe (mock always-ok / HTTP `GET /health`)
- Dialect preference (`?lang=auto|yue|en`) with force lock on worker + robot
- Emotion → Sakura expression map (`mapEmotionToExpression`) + angry/surprised presets
- VAD sensitivity prefs (`?vad=high|normal|low`) with hot `configure()` + TTS mute
- Push-to-talk hold (`createPushToTalk`) + `npm run lab` static server
- Lab hotkeys (Space / Esc / M / E) + soft latency budget HUD (`checkLatencyBudget`)
- JS `inferExpressionFromText` (TS parity) + Export Metrics / Copy lab URL
- Lab UI: Always-on, Hold to talk, Ready check, Worker, Face Live, Dialect, VAD, TTS mute, Expression, Prosody, Barge-in, Export/Import
- Docs: REALTIME_VOICE_LAB, VOICE_WORKER, CI matrix, architecture note for JS path

### Validation

```bash
cd amoji-engine
npm test && npm run typecheck && npm run build
npm run demo:e2e && npm run demo:facelive-smoke && npm run demo:http-smoke
```
