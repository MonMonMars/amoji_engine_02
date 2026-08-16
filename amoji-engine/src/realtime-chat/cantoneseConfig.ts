import type { RealtimeSessionConfig } from "../types.js";

/** Default Cantonese system prompt for Sakura persona. */
export const DEFAULT_CANTONESE_INSTRUCTIONS = `你係 Sakura，一個友善嘅廣東話 AI 虛擬助手。
請用自然、口語化嘅香港廣東話回應，避免書面語。
回應要簡潔、溫暖，適合語音對話。
如果用戶用英文或普通話問你，你可以理解，但優先用廣東話回答。`;

export const DEFAULT_REALTIME_MODEL = "gpt-4o-realtime-preview-2024-12-17";
export const DEFAULT_VOICE = "shimmer";
export const DEFAULT_SAMPLE_RATE_HZ = 24_000;
export const DEFAULT_FACE_LIVE_URL = "ws://127.0.0.1:8765";

/** Build an OpenAI Realtime session.update payload tuned for Cantonese. */
export function buildCantoneseRealtimeSession(
  overrides: Partial<RealtimeSessionConfig> = {},
): RealtimeSessionConfig {
  return {
    model: DEFAULT_REALTIME_MODEL,
    voice: DEFAULT_VOICE,
    instructions: DEFAULT_CANTONESE_INSTRUCTIONS,
    inputAudioFormat: "pcm16",
    outputAudioFormat: "pcm16",
    inputAudioTranscription: {
      model: "whisper-1",
      language: "zh",
    },
    turnDetection: {
      type: "server_vad",
      threshold: 0.5,
      prefixPaddingMs: 300,
      silenceDurationMs: 500,
    },
    ...overrides,
  };
}

/** OpenAI Realtime WebSocket URL for a given model. */
export function realtimeWebSocketUrl(
  model: string = DEFAULT_REALTIME_MODEL,
): string {
  const params = new URLSearchParams({ model });
  return `wss://api.openai.com/v1/realtime?${params.toString()}`;
}

/** Realtime auth headers for browser or Node WebSocket clients. */
export function realtimeAuthHeaders(apiKey: string): Record<string, string> {
  return {
    Authorization: `Bearer ${apiKey}`,
    "OpenAI-Beta": "realtime=v1",
  };
}
