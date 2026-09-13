import type {
  RealtimeSessionConfig,
  RealtimeSessionWire,
} from "../types.js";

/** Default Cantonese system prompt for Sakura persona. */
export const DEFAULT_CANTONESE_INSTRUCTIONS = `你係 Sakura，一個友善嘅廣東話 AI 虛擬助手。
請用自然、口語化嘅香港廣東話回應，避免書面語。
回應要簡潔、溫暖，適合語音對話。
如果用戶用英文或普通話問你，你可以理解，但優先用廣東話回答。
保留英文專有名詞同品牌名，唔好硬譯。`;

export const DEFAULT_REALTIME_MODEL = "gpt-realtime";
export const DEFAULT_VOICE = "shimmer";
export const DEFAULT_SAMPLE_RATE_HZ = 24_000;
export const DEFAULT_FACE_LIVE_URL = "ws://127.0.0.1:8765";

/** Build a domain Realtime session config tuned for Cantonese. */
export function buildCantoneseRealtimeSession(
  overrides: Partial<RealtimeSessionConfig> = {},
): RealtimeSessionConfig {
  const base: RealtimeSessionConfig = {
    model: DEFAULT_REALTIME_MODEL,
    voice: DEFAULT_VOICE,
    instructions: DEFAULT_CANTONESE_INSTRUCTIONS,
    inputAudioFormat: "pcm16",
    outputAudioFormat: "pcm16",
    inputAudioTranscription: {
      model: "gpt-4o-transcribe",
      language: "zh",
    },
    turnDetection: {
      type: "server_vad",
      threshold: 0.5,
      prefixPaddingMs: 300,
      silenceDurationMs: 500,
      createResponse: true,
    },
  };

  return {
    ...base,
    ...overrides,
    inputAudioTranscription: {
      ...base.inputAudioTranscription,
      ...overrides.inputAudioTranscription,
    },
    turnDetection: {
      ...base.turnDetection,
      ...overrides.turnDetection,
    },
  };
}

/**
 * Convert domain session config → OpenAI Realtime GA wire payload.
 * Domain code stays camelCase; only the WebSocket boundary speaks snake_case.
 */
export function toRealtimeSessionWire(
  config: RealtimeSessionConfig,
  sampleRateHz: number = DEFAULT_SAMPLE_RATE_HZ,
): RealtimeSessionWire {
  const turn = config.turnDetection;
  return {
    type: "realtime",
    model: config.model,
    instructions: config.instructions,
    output_modalities: ["audio"],
    audio: {
      input: {
        format: { type: "audio/pcm", rate: sampleRateHz },
        transcription: {
          model: config.inputAudioTranscription.model,
          ...(config.inputAudioTranscription.language
            ? { language: config.inputAudioTranscription.language }
            : {}),
        },
        turn_detection: {
          type: turn.type,
          ...(turn.threshold !== undefined
            ? { threshold: turn.threshold }
            : {}),
          ...(turn.prefixPaddingMs !== undefined
            ? { prefix_padding_ms: turn.prefixPaddingMs }
            : {}),
          ...(turn.silenceDurationMs !== undefined
            ? { silence_duration_ms: turn.silenceDurationMs }
            : {}),
          ...(turn.createResponse !== undefined
            ? { create_response: turn.createResponse }
            : {}),
        },
      },
      output: {
        format: { type: "audio/pcm", rate: sampleRateHz },
        voice: config.voice,
      },
    },
  };
}

/** OpenAI Realtime WebSocket URL for a given model. */
export function realtimeWebSocketUrl(
  model: string = DEFAULT_REALTIME_MODEL,
): string {
  const params = new URLSearchParams({ model });
  return `wss://api.openai.com/v1/realtime?${params.toString()}`;
}

/**
 * Auth headers for Node `ws` (browser must use an auth proxy / client secret).
 * GA Realtime no longer requires the beta header.
 */
export function realtimeAuthHeaders(apiKey: string): Record<string, string> {
  return {
    Authorization: `Bearer ${apiKey}`,
  };
}
