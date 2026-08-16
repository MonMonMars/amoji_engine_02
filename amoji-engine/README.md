# @amoji/engine

Cantonese **realtime voice chat** + **Sakura Face Live** orchestration stack for the Amoji Engine project.

## Stack overview

```
┌─────────────┐    ┌──────────────────┐    ┌─────────────────────┐
│ Microphone  │───▶│   VoiceBridge    │───▶│  RealtimeChatClient │
│  (PCM16)    │    │  frame + route   │    │  OpenAI Realtime GA │
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
| **Realtime chat** | `src/realtime-chat/` | OpenAI Realtime GA client tuned for Cantonese |
| **Voice bridge** | `src/voice-bridge/` | Frames mic/speaker PCM16 audio between capture and Realtime |
| **Face Live driver** | `src/face-live/` | Sakura avatar control via VTube Studio–compatible WebSocket API |
| **Orchestrator** | `src/orchestrator/` | Coordinates listen → think → speak, barge-in, lip-sync |

## Quick start

```bash
cd amoji-engine
npm install
npm test
npm run build
npm run demo:dry   # mock Face Live handshake + lip-sync (no API key)
```

### Minimal usage (voice-only)

```typescript
import { AmojiOrchestrator } from "@amoji/engine";

const engine = new AmojiOrchestrator({
  openAiApiKey: process.env.OPENAI_API_KEY!,
  voiceOnly: true, // skip Face Live if bridge is offline
});

engine.on("transcript", ({ role, text, final }) => {
  console.log(`[${role}${final === false ? "*" : ""}] ${text}`);
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
- Stream mic audio to OpenAI Realtime with Cantonese instructions (GA wire format)
- Auto barge-in when the user speaks over the assistant
- Drive Sakura lip-sync (smoothed RMS) from assistant TTS audio
- Map transcript keywords to expression presets (happy, surprised, thinking, …)

### Local mock Face Live

```typescript
import { startMockFaceLiveBridge, SakuraFaceLiveDriver } from "@amoji/engine";

const mock = await startMockFaceLiveBridge(); // ephemeral port
const face = new SakuraFaceLiveDriver({ url: mock.url });
await face.connect();
```

Or: `npm run demo -- --mock-face-live`

## Configuration

| Option | Default | Description |
| --- | --- | --- |
| `openAiApiKey` | — | Required. OpenAI API key |
| `realtimeModel` | `gpt-realtime` | Realtime model id |
| `faceLiveUrl` | `ws://127.0.0.1:8765` | Sakura Face Live WebSocket |
| `voice` | `shimmer` | OpenAI TTS voice |
| `sampleRateHz` | `24000` | PCM sample rate |
| `systemInstructions` | Cantonese Sakura persona | Override system prompt |
| `voiceOnly` | `false` | Skip Face Live connection |
| `autoCreateResponse` | `true` | Let server VAD create responses |
| `faceLiveAuthToken` | — | Cached VTS authentication token |

## Docs

- [Architecture](./docs/architecture.md)
- [Setup guide](./docs/setup.md)
- [Cantonese Realtime tuning](./docs/cantonese-realtime.md)
- [Always-on listen (VAD)](./docs/always-on-listen.md)
- [VoiceChatOrchestrator](./docs/VOICE_CHAT_ORCHESTRATOR.md)
- [Session & presence (lab archive)](./docs/SESSION_AND_PRESENCE.md)

## Scripts

| Command | Description |
| --- | --- |
| `npm test` | Run Vitest unit tests (TS + always-on listen) |
| `npm run build` | Compile TypeScript to `dist/` |
| `npm run typecheck` | Type-check without emit |
| `npm run demo:dry` | Mock Face Live smoke test (no API key) |
| `npm run demo` | Live session (needs `OPENAI_API_KEY`) |

Prototype lab UI: [`../prototypes/realtime-voice-lab.html`](../prototypes/realtime-voice-lab.html) (Always-on button).

## License

MIT
