# Setup guide

## Prerequisites

- **Node.js 20+**
- **OpenAI API key** with Realtime API access
- **Sakura Face Live bridge** (optional) — VTube Studio with API enabled, or a compatible WebSocket proxy on port `8765`

## Install

```bash
cd amoji-engine
npm install
npm test        # verify the stack
npm run build   # compile dist/
```

## Environment variables

```bash
export OPENAI_API_KEY="sk-..."
# Optional overrides:
export AMOJI_FACE_LIVE_URL="ws://127.0.0.1:8765"
export AMOJI_REALTIME_MODEL="gpt-4o-realtime-preview-2024-12-17"
```

## Sakura Face Live bridge

### Option A: VTube Studio (recommended)

1. Install [VTube Studio](https://denchisoft.com/) and load your Sakura Live2D model.
2. Enable the **API** in settings (default WebSocket port `8001`).
3. Point `faceLiveUrl` at VTube Studio, or run a small port-forward proxy from `8765` → `8001`.

### Option B: Custom bridge on 8765

Run any WebSocket server that accepts VTube Studio Public API messages. The driver sends:

- `AuthenticationTokenRequest` on connect
- `InjectParameterDataRequest` for expressions and lip-sync

## Browser vs Node

| Environment | Mic capture | Realtime auth | Face Live |
| --- | --- | --- | --- |
| **Node** | External capture (e.g. `node-mic`) | Native `ws` + Bearer headers | `ws` client |
| **Browser** | `getUserMedia` + AudioWorklet | Proxy WebSocket (headers required) | `WebSocket` |

For browser deployments, run a small auth proxy that adds `Authorization` and `OpenAI-Beta` headers to the Realtime WebSocket upgrade.

## Smoke test (voice-only)

```typescript
import { AmojiOrchestrator } from "./dist/index.js";

const engine = new AmojiOrchestrator({
  openAiApiKey: process.env.OPENAI_API_KEY!,
  voiceOnly: true,
});

engine.on("phase", console.log);
engine.on("transcript", console.log);

await engine.start();
// feed mic frames...
await engine.stop();
```
