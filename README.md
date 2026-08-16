# amoji_engine_02

**FaceLive** — Cantonese realtime voice chat with Sakura avatar orchestration.

## Packages

| Path | Description |
| --- | --- |
| [`amoji-engine/`](./amoji-engine/) | TypeScript library: Realtime voice chat, voice bridge, Sakura Face Live driver, orchestrator |

## amoji-engine quick start

```bash
cd amoji-engine
npm install
npm test
npm run build
```

See [amoji-engine/README.md](./amoji-engine/README.md) for full API docs.

## Requirements

- Node.js 20+
- OpenAI API key (Realtime API)
- Sakura Face Live bridge on `ws://127.0.0.1:8765` (optional; use `voiceOnly: true` without it)

```bash
cd amoji-engine && npm run demo:dry
```

## Branch

Active development for the voice stack: [`cursor/realtime-voice-chat-0f5c`](https://github.com/MonMonMars/amoji_engine_02/tree/cursor/realtime-voice-chat-0f5c)
