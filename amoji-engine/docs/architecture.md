# Architecture

## Design goals

1. **Cantonese-first** — system instructions, transcription language, and expression heuristics target Hong Kong Cantonese.
2. **Modular** — each layer (realtime, bridge, face live, orchestrator) is independently testable.
3. **Runtime-agnostic** — works in Node (with `ws`) or browser (inject `createWebSocket` for auth proxying).
4. **Graceful degradation** — `voiceOnly` mode continues if Face Live bridge is unavailable.
5. **Honest wire boundary** — domain config stays camelCase; `toRealtimeSessionWire()` emits OpenAI Realtime GA snake_case / nested `audio` payloads.

## Component responsibilities

### RealtimeChatClient

- Opens a WebSocket to `wss://api.openai.com/v1/realtime`
- Sends GA `session.update` with Cantonese persona + server VAD
- Streams `input_audio_buffer.append` from mic frames
- Accepts both GA (`response.output_audio.*`) and legacy (`response.audio.*`) server events
- Emits `userTranscript`, `assistantTranscript`, `audioDelta`, `responseDone`

### VoiceBridge

- Buffers raw mic samples into fixed-size PCM16 frames (default 20ms @ 24kHz)
- Queues assistant TTS chunks for speaker output
- Tracks byte/frame statistics for debugging

### SakuraFaceLiveDriver

- Connects to local Face Live bridge (default port 8765)
- Completes VTube Studio two-step auth: `AuthenticationTokenRequest` → `AuthenticationRequest`
- Injects Live2D parameters via `InjectParameterDataRequest`
- Expression presets + smoothed RMS lip-sync from TTS audio
- Reuses cached `authenticationToken` across reconnects when provided

### AmojiOrchestrator

State machine:

```
idle → listening → thinking → speaking → listening
         ↑              │         │
         └──── barge-in ┴─────────┘
```

Wires Realtime events to Face Live reactions and exposes a unified event API.
When `autoCreateResponse` is true (default), server VAD creates responses — the orchestrator does **not** double-send `response.create`.

## Event flow (happy path)

1. User speaks → VoiceBridge frames mic → Realtime `append`
2. Server VAD detects end of speech → `thinking` (+ optional commit if auto-create is off)
3. User transcript event → Face Live expression from keywords
4. Assistant audio deltas → VoiceBridge playback + smoothed lip-sync injection
5. `response.done` → reset mouth, return to `listening`

## Extension points

- **Custom WebSocket factory** — required in browser (auth headers) or for local proxies
- **Expression presets** — edit `SAKURA_EXPRESSION_PRESETS` in `expressions.ts`
- **Persona** — pass `systemInstructions` to orchestrator options
- **Mock Face Live** — `startMockFaceLiveBridge()` for CI / dry-run demos
