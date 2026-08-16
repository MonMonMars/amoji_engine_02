# Cantonese Realtime tuning

## Default persona

The built-in `DEFAULT_CANTONESE_INSTRUCTIONS` prompt instructs Sakura to:

- Reply in natural Hong Kong Cantonese (口語)
- Avoid overly formal written Chinese (書面語)
- Keep responses concise for voice conversation
- Understand English/Mandarin input but prefer Cantonese output
- Keep English proper nouns / brand names untranslated

Override via orchestrator config:

```typescript
new AmojiOrchestrator({
  openAiApiKey: "...",
  systemInstructions: "你係 Sakura，用廣東話同用戶傾計…",
});
```

## Wire format (GA)

Domain config is camelCase. Before send, `toRealtimeSessionWire()` produces the OpenAI Realtime GA payload:

```json
{
  "type": "realtime",
  "model": "gpt-realtime",
  "instructions": "…",
  "output_modalities": ["audio"],
  "audio": {
    "input": {
      "format": { "type": "audio/pcm", "rate": 24000 },
      "transcription": { "model": "gpt-4o-transcribe", "language": "zh" },
      "turn_detection": {
        "type": "server_vad",
        "threshold": 0.5,
        "prefix_padding_ms": 300,
        "silence_duration_ms": 500,
        "create_response": true
      }
    },
    "output": {
      "format": { "type": "audio/pcm", "rate": 24000 },
      "voice": "shimmer"
    }
  }
}
```

The client also accepts legacy beta event names (`response.audio.delta`, …) for compatibility.

## Transcription

Default transcription model: `gpt-4o-transcribe` with `language: "zh"`.
Mixed Cantonese/English utterances are handled reasonably well.

## Voice activity detection

Server VAD defaults:

| Parameter | Value | Notes |
| --- | --- | --- |
| `threshold` | 0.5 | Sensitivity |
| `prefixPaddingMs` | 300 | Pre-roll before speech |
| `silenceDurationMs` | 500 | End-of-turn silence |
| `createResponse` | true | Server auto-creates responses |

Tune for noisy environments by raising `threshold` or `silenceDurationMs`.
Set `autoCreateResponse: false` on the orchestrator if you need manual `response.create` control.

## TTS voice

Default OpenAI voice: `shimmer`. Alternatives that work well for Cantonese:

- `shimmer` — warm, conversational (default)
- `alloy` — neutral
- `coral` — expressive

Pass `voice: "alloy"` in orchestrator options.

## Expression heuristics

`inferExpressionFromText()` uses lightweight keyword rules (sad/thinking before punctuation surprises):

| Cue | Expression |
| --- | --- |
| 哈哈, 開心, 好呀, 鍾意 | `happy` |
| 哇, 唔信, `!!` | `surprised` |
| 諗, 點解, hmm | `thinking` |
| 唉, 傷心, sorry | `sad` |
| (default) | `neutral` |

## Lip-sync

`mouthOpenFromPcm16()` computes RMS amplitude; `smoothMouthOpen()` exponential-smooths toward the next frame (default α=0.45) before mapping to `ParamMouthOpenY`. Adjust `sensitivity` or Face Live `lipSyncAlpha` if Sakura’s mouth moves too much or too little.

## Rate limits & costs

OpenAI Realtime is billed per audio/token usage. For development:

- Use `voiceOnly: true` to skip Face Live during API testing
- Use `npm run demo:dry` / `startMockFaceLiveBridge()` without an API key
- Feed short synthetic PCM frames in unit tests
- Monitor session duration and disconnect with `engine.stop()` when idle
