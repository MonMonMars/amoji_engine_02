# Cantonese Realtime tuning

## Default persona

The built-in `DEFAULT_CANTONESE_INSTRUCTIONS` prompt instructs Sakura to:

- Reply in natural Hong Kong Cantonese (口語)
- Avoid overly formal written Chinese (書面語)
- Keep responses concise for voice conversation
- Understand English/Mandarin input but prefer Cantonese output

Override via orchestrator config:

```typescript
new AmojiOrchestrator({
  openAiApiKey: "...",
  systemInstructions: "你係 Sakura，用廣東話同用戶傾計…",
});
```

## Transcription

`buildCantoneseRealtimeSession()` sets:

```json
{
  "inputAudioTranscription": {
    "model": "whisper-1",
    "language": "zh"
  }
}
```

Whisper uses `zh` for Chinese; mixed Cantonese/English utterances are handled reasonably well. For code-switching-heavy sessions, consider adding instructions like “保留英文專有名詞”.

## Voice activity detection

Server VAD defaults:

| Parameter | Value | Notes |
| --- | --- | --- |
| `threshold` | 0.5 | Sensitivity |
| `prefixPaddingMs` | 300 | Pre-roll before speech |
| `silenceDurationMs` | 500 | End-of-turn silence |

Tune for noisy environments by raising `threshold` or `silenceDurationMs`.

## TTS voice

Default OpenAI voice: `shimmer`. Alternatives that work well for Cantonese:

- `shimmer` — warm, conversational (default)
- `alloy` — neutral
- `coral` — expressive

Pass `voice: "alloy"` in orchestrator options.

## Expression heuristics

`inferExpressionFromText()` uses lightweight keyword rules:

| Cue | Expression |
| --- | --- |
| 哈哈, 開心, 好呀 | `happy` |
| 哇, 唔信, `!` | `surprised` |
| 諗, 點解, hmm | `thinking` |
| 唉, 傷心, sorry | `sad` |
| (default) | `neutral` |

Extend `inferExpressionFromText` in `src/face-live/expressions.ts` for your Sakura persona.

## Lip-sync

`mouthOpenFromPcm16()` computes RMS amplitude from assistant TTS PCM16 and maps to `ParamMouthOpenY`. Adjust `sensitivity` (default `1.5`) if Sakura’s mouth moves too much or too little.

## Rate limits & costs

OpenAI Realtime is billed per audio/token usage. For development:

- Use `voiceOnly: true` to skip Face Live during API testing
- Feed short synthetic PCM frames in unit tests (see `orchestrator.test.ts`)
- Monitor session duration and disconnect with `engine.stop()` when idle
