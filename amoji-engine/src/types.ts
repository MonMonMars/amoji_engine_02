/** Shared connection and lifecycle states for stack components. */
export type ConnectionState =
  | "idle"
  | "connecting"
  | "connected"
  | "reconnecting"
  | "disconnected"
  | "error";

export type OrchestratorPhase =
  | "idle"
  | "listening"
  | "thinking"
  | "speaking"
  | "error";

export interface AmojiEngineConfig {
  /** OpenAI API key for Realtime sessions. */
  openAiApiKey: string;
  /** Realtime model id (defaults to gpt-realtime). */
  realtimeModel?: string;
  /** Sakura Face Live WebSocket URL (defaults to ws://127.0.0.1:8765). */
  faceLiveUrl?: string;
  /** System instructions for Cantonese persona. */
  systemInstructions?: string;
  /** OpenAI voice id for TTS output. */
  voice?: string;
  /** Sample rate for PCM audio bridging (defaults to 24000). */
  sampleRateHz?: number;
  /**
   * When true, server VAD auto-creates responses (GA default).
   * When false, the orchestrator commits + response.create on speech_stopped.
   */
  autoCreateResponse?: boolean;
}

/** Domain-friendly Realtime session config (converted to wire format on send). */
export interface RealtimeSessionConfig {
  model: string;
  voice: string;
  instructions: string;
  inputAudioFormat: "pcm16";
  outputAudioFormat: "pcm16";
  inputAudioTranscription: {
    model: string;
    language?: string;
  };
  turnDetection: {
    type: "server_vad" | "semantic_vad";
    threshold?: number;
    prefixPaddingMs?: number;
    silenceDurationMs?: number;
    /** When false, client must call response.create after commit. */
    createResponse?: boolean;
  };
}

/** OpenAI Realtime GA `session.update` wire payload. */
export interface RealtimeSessionWire {
  type: "realtime";
  model: string;
  instructions: string;
  output_modalities: Array<"audio" | "text">;
  audio: {
    input: {
      format: { type: "audio/pcm"; rate: number };
      transcription: { model: string; language?: string };
      turn_detection: {
        type: "server_vad" | "semantic_vad";
        threshold?: number;
        prefix_padding_ms?: number;
        silence_duration_ms?: number;
        create_response?: boolean;
      };
    };
    output: {
      format: { type: "audio/pcm"; rate: number };
      voice: string;
    };
  };
}

export interface FaceLiveParameter {
  id: string;
  value: number;
}

export type SakuraExpression =
  | "neutral"
  | "happy"
  | "surprised"
  | "thinking"
  | "sad"
  | "blink";

export interface VoiceBridgeStats {
  framesSent: number;
  framesReceived: number;
  bytesSent: number;
  bytesReceived: number;
}

export interface OrchestratorEventMap {
  phase: OrchestratorPhase;
  transcript: { role: "user" | "assistant"; text: string; final?: boolean };
  audioOut: { pcm16: Int16Array };
  faceLive: { expression: SakuraExpression; parameters: FaceLiveParameter[] };
  error: { source: string; message: string; cause?: unknown };
  state: { component: string; state: ConnectionState };
}

export type OrchestratorEventName = keyof OrchestratorEventMap;

export type OrchestratorListener<K extends OrchestratorEventName> = (
  payload: OrchestratorEventMap[K],
) => void;

export interface RealtimeClientEvents {
  connected: void;
  disconnected: { code: number; reason: string };
  sessionCreated: { sessionId: string };
  userTranscript: { text: string };
  assistantTranscript: { text: string; final: boolean };
  audioDelta: { pcm16: Int16Array };
  speechStarted: void;
  speechStopped: void;
  responseDone: void;
  error: { message: string; cause?: unknown };
}

export type RealtimeEventName = keyof RealtimeClientEvents;

export type RealtimeListener<K extends RealtimeEventName> = (
  payload: RealtimeClientEvents[K],
) => void;
