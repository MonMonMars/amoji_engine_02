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
  /** Realtime model id (defaults to gpt-4o-realtime-preview). */
  realtimeModel?: string;
  /** Sakura Face Live WebSocket URL (defaults to ws://127.0.0.1:8765). */
  faceLiveUrl?: string;
  /** System instructions for Cantonese persona. */
  systemInstructions?: string;
  /** OpenAI voice id for TTS output. */
  voice?: string;
  /** Sample rate for PCM audio bridging (defaults to 24000). */
  sampleRateHz?: number;
}

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
    type: "server_vad";
    threshold?: number;
    prefixPaddingMs?: number;
    silenceDurationMs?: number;
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
  transcript: { role: "user" | "assistant"; text: string };
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
  assistantTranscript: { text: string };
  audioDelta: { pcm16: Int16Array };
  speechStarted: void;
  speechStopped: void;
  error: { message: string; cause?: unknown };
}

export type RealtimeEventName = keyof RealtimeClientEvents;

export type RealtimeListener<K extends RealtimeEventName> = (
  payload: RealtimeClientEvents[K],
) => void;
