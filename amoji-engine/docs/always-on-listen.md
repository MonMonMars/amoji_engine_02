# Always-on listen

Energy-VAD end-of-utterance loop for continuous Cantonese voice turns.

## Module

`amoji-engine/engine/voice/alwaysOnListen.js` (exported from `engine/index.js`)

| Export | Role |
| --- | --- |
| `ALWAYS_ON_LISTEN_SCHEMA` | Option defaults / bounds |
| `createUtteranceDetector` | State machine: `idle → speaking → trailing → ended` |
| `AlwaysOnListenController` | `mic.onFrame` → VAD → `stopListeningAndTalk` → `startListening` |
| `createAlwaysOnListen` | Factory |
| `opts.getTurnExtra` | Optional async/sync extra payload for each talk turn |

## Defaults

- `energyThreshold`: `0.02` (RMS)
- `minSpeechMs`: `120`
- `trailingSilenceMs`: `500`
- `sampleRateHz`: `24000`

## Lab prototype

Open [`../../prototypes/realtime-voice-lab.html`](../../prototypes/realtime-voice-lab.html) via a static server that can resolve the `../amoji-engine/engine/` ES module import, then toggle **Always-on**.

## Test

```bash
cd amoji-engine && npm test
```
