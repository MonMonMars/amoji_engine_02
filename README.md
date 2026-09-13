# amoji_engine_02

**FaceLive** — Cantonese realtime voice chat with Sakura avatar orchestration.

## Layout

| Path | Description |
| --- | --- |
| [`amoji-engine/`](./amoji-engine/) | Library: OpenAI Realtime GA, Face Live, always-on VAD, SenseVoice/CosyVoice worker client |
| [`prototypes/realtime-voice-lab.html`](./prototypes/realtime-voice-lab.html) | Browser lab: Always-on, Worker, Face Live, prosody, barge-in, session archive |

## Quick start

**Online (no local PC):** see [DEPLOY.md](./DEPLOY.md) — deploy to Vercel, open your `*.vercel.app` URL.

**Windows local:** see [WINDOWS.md](./WINDOWS.md) — double-click `start-companion.cmd` or run `node amoji-engine\scripts\lab-serve.mjs` from CMD.

```bash
cd amoji-engine
npm install
npm test
npm run build
npm run demo:e2e
npm run demo:facelive-smoke
```

Serve the **repo root** and open the lab:

```text
prototypes/realtime-voice-lab.html
  ?worker=http://127.0.0.1:7890   # optional HTTP worker
  ?face=ws://127.0.0.1:8765       # optional Face Live / VTS
```

```bash
# optional local stubs
cd amoji-engine && npm run voice-worker:mock   # :7890
cd amoji-engine && npm run demo:dry            # mock Face Live (TS)
```

Full API + module map: [amoji-engine/README.md](./amoji-engine/README.md).

## Requirements

- Node.js 20+
- OpenAI API key (only for live Realtime demos)
- Sakura Face Live / VTube Studio API (optional)

## Branch / PR

- Branch: [`cursor/realtime-voice-chat-0f5c`](https://github.com/MonMonMars/amoji_engine_02/tree/cursor/realtime-voice-chat-0f5c)
- PR: [#2](https://github.com/MonMonMars/amoji_engine_02/pull/2)
