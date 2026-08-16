# VoiceChatOrchestrator

JS engine coordinator for listen → talk turns, with optional **always-on** energy-VAD looping.

## Module

`amoji-engine/engine/voice/voiceChatOrchestrator.js` (exported from `engine/index.js`)

| API | Role |
| --- | --- |
| `createVoiceChatOrchestrator(opts)` / `VoiceChatOrchestrator` | Host façade |
| `opts.alwaysOn` | `true` or VAD overrides — marks always-on mode |
| `startAlwaysOn()` / `stopAlwaysOn()` | Start/stop `createAlwaysOnListen` loop |
| `startListening()` / `stopListeningAndTalk(extra)` | Turn hooks used by always-on and manual PTT |

## Always-on wiring

When `startAlwaysOn()` runs, the orchestrator builds `createAlwaysOnListen({ mic, startListening, stopListeningAndTalk, getTurnExtra, …vad })`:

1. `startListening()` → host `onStartListening`
2. Mic frames → utterance detector (`idle → speaking → trailing → ended`)
3. On end → `getTurnExtra?` → `stopListeningAndTalk(extra)` → host `onStopListeningAndTalk`
4. Loop back to `startListening()` until `stopAlwaysOn()`

See also [Always-on listen](./always-on-listen.md).

## Example

```js
import { createVoiceChatOrchestrator } from "@amoji/engine/engine";

const orch = createVoiceChatOrchestrator({
  mic, // { onFrame(cb) => unsubscribe }
  alwaysOn: true,
  onStartListening: () => session.armMic(),
  onStopListeningAndTalk: (extra) => session.commitAndRespond(extra),
  getTurnExtra: () => ({ source: "always-on" }),
});

await orch.startAlwaysOn();
// …
await orch.stopAlwaysOn();
```
