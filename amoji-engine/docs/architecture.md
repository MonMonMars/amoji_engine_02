# Architecture

## Design goals

1. **Cantonese-first** — system instructions, transcription language, and expression heuristics target Hong Kong Cantonese.
2. **Modular** — each layer (realtime, bridge, face live, orchestrator) is independently testable.
3. **Runtime-agnostic** — works in Node (with `ws`) or browser (inject `createWebSocket` for auth proxying).
4. **Graceful degradation** — `voiceOnly` mode continues if Face Live bridge is unavailable.

## Component responsibilities

### RealtimeChatClient

- Opens a WebSocket to `wss://api.openai.com/v1/realtime`
- Sends `session.update` with Cantonese persona + server VAD
- Streams `input_audio_buffer.append` from mic frames
- Emits `userTranscript`, `assistantTranscript`, `audioDelta` events

### VoiceBridge

- Buffers raw mic samples into fixed-size PCM16 frames (default 20ms @ 24kHz)
- Queues assistant TTS chunks for speaker output
- Tracks byte/frame statistics for debugging

### SakuraFaceLiveDriver

- Connects to local Face Live bridge (default port 8765)
- Authenticates with VTube Studio–compatible `AuthenticationTokenRequest`
- Injects Live2D parameters via `InjectParameterDataRequest`
- Expression presets + RMS-based lip-sync from TTS audio

### AmojiOrchestrator

State machine:

```
idle → listening → thinking → speaking → listening
         ↑                              │
         └──────── interrupt ───────────┘
```

Wires Realtime events to Face Live reactions and exposes a unified event API.

## Event flow (happy path)

1. User speaks → VoiceBridge frames mic → Realtime `append`
2. Server VAD detects end of speech → orchestrator `commit` + `response.create`
3. User transcript event → Face Live expression from keywords
4. Assistant audio deltas → VoiceBridge playback + lip-sync injection
5. Assistant transcript → expression update

## Extension points

- **Custom WebSocket factory** — required in browser (auth headers) or for local proxies
- **Expression presets** — edit `SAKURA_EXPRESSION_PRESETS` in `expressions.ts`
- **Persona** — pass `systemInstructions` to orchestrator options
