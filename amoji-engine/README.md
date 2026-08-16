# @amoji/engine

Cantonese **realtime voice chat** + **Sakura Face Live** orchestration stack for the Amoji Engine project.

## Stack overview

```
┌─────────────┐    ┌──────────────────┐    ┌─────────────────────┐
│ Microphone  │───▶│   VoiceBridge    │───▶│  RealtimeChatClient │
│  (PCM16)    │    │  frame + route   │    │  OpenAI Realtime API│
└─────────────┘    └──────────────────┘    └──────────┬──────────┘
                                                      │
                                                      ▼
┌─────────────┐    ┌──────────────────┐    ┌─────────────────────┐
│  Speakers   │◀───│ AmojiOrchestrator│◀───│  Assistant TTS PCM  │
└─────────────┘    └────────┬─────────┘    └─────────────────────┘
                              │
                              ▼
                   ┌─────────────────────┐
                   │ SakuraFaceLiveDriver│
                   │  ws://127.0.0.1:8765│
                   │  Live2D lip-sync    │
                   └─────────────────────┘
```

| Module | Path | Role |
| --- | --- | --- |
| **Realtime chat** | `src/realtime-chat/` | OpenAI Realtime API client tuned for Cantonese (`zh` transcription, server VAD) |
| **Voice bridge** | `src/voice-bridge/` | Frames mic/speaker PCM16 audio between capture and Realtime |
| **Face Live driver** | `src/face-live/` | Sakura avatar control via VTube Studio–compatible WebSocket API |
| **Orchestrator** | `src/orchestrator/` | Coordinates listen → think → speak phases and wires events |

## Quick start

```bash
cd amoji-engine
npm install
npm test
npm run build
```

### Minimal usage (voice-only)

```typescript
import { AmojiOrchestrator } from "@amoji/engine";

const engine = new AmojiOrchestrator({
  openAiApiKey: process.env.OPENAI_API_KEY!,
  voiceOnly: true, // skip Face Live if bridge is offline
});

engine.on("transcript", ({ role, text }) => {
  console.log(`[${role}] ${text}`);
});

engine.on("audioOut", ({ pcm16 }) => {
  // play pcm16 through your audio output
});

await engine.start();

// Push mic frames (480 samples @ 24kHz = 20ms per frame)
engine.pushMicAudio(micPcm16Frame);

await engine.stop();
```

### Full stack (voice + Sakura Face Live)

1. Start the Sakura Face Live bridge on `ws://127.0.0.1:8765` (VTube Studio API or compatible proxy).
2. Set `OPENAI_API_KEY` in your environment.
3. Run without `voiceOnly`:

```typescript
const engine = new AmojiOrchestrator({
  openAiApiKey: process.env.OPENAI_API_KEY!,
  faceLiveUrl: "ws://127.0.0.1:8765",
});
await engine.start();
```

The orchestrator will:
- Stream mic audio to OpenAI Realtime with Cantonese instructions
- Drive Sakura lip-sync from assistant TTS audio
- Map transcript keywords to expression presets (happy, surprised, thinking, …)

## Configuration

| Option | Default | Description |
| --- | --- | --- |
| `openAiApiKey` | — | Required. OpenAI API key |
| `realtimeModel` | `gpt-4o-realtime-preview-2024-12-17` | Realtime model id |
| `faceLiveUrl` | `ws://127.0.0.1:8765` | Sakura Face Live WebSocket |
| `voice` | `shimmer` | OpenAI TTS voice |
| `sampleRateHz` | `24000` | PCM sample rate |
| `systemInstructions` | Cantonese Sakura persona | Override system prompt |
| `voiceOnly` | `false` | Skip Face Live connection |

## Docs

- [Architecture](./docs/architecture.md)
- [Setup guide](./docs/setup.md)
- [Cantonese Realtime tuning](./docs/cantonese-realtime.md)

## Scripts

| Command | Description |
| --- | --- |
| `npm test` | Run Vitest unit tests |
| `npm run build` | Compile TypeScript to `dist/` |
| `npm run typecheck` | Type-check without emit |

## License

MIT
