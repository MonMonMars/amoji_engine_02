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
npm run demo:dry  # mock Face Live smoke test
```

## Environment variables

```bash
export OPENAI_API_KEY="sk-..."
# Optional overrides:
export AMOJI_FACE_LIVE_URL="ws://127.0.0.1:8765"
export AMOJI_REALTIME_MODEL="gpt-realtime"
```

## Sakura Face Live bridge

### Option A: VTube Studio (recommended)

1. Install [VTube Studio](https://denchisoft.com/) and load your Sakura Live2D model.
2. Enable the **API** in settings (default WebSocket port `8001`).
3. Point `faceLiveUrl` at VTube Studio (`ws://127.0.0.1:8001`), or run a small port-forward proxy from `8765` → `8001`.
4. Approve the **Amoji Engine** plugin prompt once; pass the returned token as `faceLiveAuthToken` on later runs.

### Option B: Custom bridge on 8765

Run any WebSocket server that accepts VTube Studio Public API messages. The driver sends:

1. `AuthenticationTokenRequest` (skipped if `faceLiveAuthToken` is set)
2. `AuthenticationRequest` with the token
3. `InjectParameterDataRequest` for expressions and lip-sync

### Option C: Built-in mock (tests / dry-run)

```bash
npm run demo:dry
```

This starts an ephemeral mock bridge, completes auth, applies a happy expression, and drives lip-sync.

## Browser vs Node

| Environment | Mic capture | Realtime auth | Face Live |
| --- | --- | --- | --- |
| **Node** | External capture (e.g. `node-mic`) | Native `ws` + Bearer headers | `ws` client |
| **Browser** | `getUserMedia` + AudioWorklet | Proxy / ephemeral client secret | `WebSocket` |

For browser deployments, run a small auth proxy that adds `Authorization` on the Realtime WebSocket upgrade, or mint an ephemeral client secret via `POST /v1/realtime/client_secrets`.

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

## Offline validation (no API key)

```bash
npm test
npm run demo:e2e
npm run demo:facelive-smoke
npm run demo:http-smoke
```

Lab walkthrough: [Realtime voice lab](./REALTIME_VOICE_LAB.md). Worker: [Voice worker](./VOICE_WORKER.md).
