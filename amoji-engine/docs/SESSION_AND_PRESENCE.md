# Session & presence (lab)

## Session archive (realtime voice lab)

The lab façade in `engine/lab/sessionArchive.js` keeps:

| Piece | Role |
| --- | --- |
| `labChat` | Persistent chat log (optional `localStorage`) |
| `tickRecorder` | Relative-time event ticks (VAD, phase, connect, export/import) |
| `exportSessionArchive` | Build JSON + optional browser **download** |
| `importSessionArchive` | Restore from **file input** / Blob / string / object |

Archive shape:

```json
{
  "schemaVersion": 1,
  "kind": "amoji-realtime-voice-lab-session",
  "exportedAt": "…",
  "meta": { "lab": "realtime-voice-lab" },
  "chat": { "messages": [/* … */] },
  "ticks": { "startedAt": 0, "ticks": [/* … */] }
}
```

Prototype UI: [`../../prototypes/realtime-voice-lab.html`](../../prototypes/realtime-voice-lab.html) — **Export Session** / **Import Session**.

```js
import { createLabSessionFacade } from "@amoji/engine/engine";

const session = createLabSessionFacade({ storageKey: "amoji.realtimeVoiceLab.session" });
session.appendChat({ role: "user", text: "你好" });
session.exportSessionArchive({ download: true });
await session.importSessionArchive(fileFromInput);
```

See also [VoiceChatOrchestrator](./VOICE_CHAT_ORCHESTRATOR.md) for always-on listen wiring.
