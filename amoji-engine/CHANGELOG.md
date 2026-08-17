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
- Lab UI: Always-on, Worker, Face Live, Prosody, Barge-in, Export/Import
- Docs: REALTIME_VOICE_LAB, VOICE_WORKER, CI matrix, architecture note for JS path

### Validation

```bash
cd amoji-engine
npm test && npm run typecheck && npm run build
npm run demo:e2e && npm run demo:facelive-smoke && npm run demo:http-smoke
```
