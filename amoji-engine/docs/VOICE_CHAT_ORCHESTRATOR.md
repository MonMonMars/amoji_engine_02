# VoiceChatOrchestrator

JS engine coordinator for listen → talk turns, with optional **always-on** energy-VAD looping.

## Axes

| Axis | Module / surface | Role |
| --- | --- | --- |
| **Always-on** | `engine/voice/alwaysOnListen.js` + `VoiceChatOrchestrator.startAlwaysOn()` | Energy-VAD listen loop (`idle → speaking → trailing → ended`) |
| **Archive** | `engine/lab/sessionArchive.js` + lab Export/Import | Persist `labChat` + `tickRecorder` session JSON |
| **Robot** | `engine/voice/voiceRobotBridge.js` + Robot steps HUD | Plan/emotion events: `sakura` → `lip_sync` → `done` / `aborted` |

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

See also [Always-on listen](./always-on-listen.md), [Session & presence](./SESSION_AND_PRESENCE.md).

## Robot bridge (lab HUD)

`createVoiceRobotBridge()` drives the **Robot steps** panel in `prototypes/realtime-voice-lab.html`:

- Events: `sakura`, `lip_sync`, `done`, `aborted`
- HUD fields: `phase`, `emotion`, `summary`, first `steps`
- `Clear` resets the HUD via `robot.reset()` (and clears the lab session façade)

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
