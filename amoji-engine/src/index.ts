export type {
  AmojiEngineConfig,
  ConnectionState,
  FaceLiveParameter,
  OrchestratorEventMap,
  OrchestratorEventName,
  OrchestratorListener,
  OrchestratorPhase,
  RealtimeClientEvents,
  RealtimeEventName,
  RealtimeListener,
  RealtimeSessionConfig,
  SakuraExpression,
  VoiceBridgeStats,
} from "./types.js";

export {
  DEFAULT_CANTONESE_INSTRUCTIONS,
  DEFAULT_FACE_LIVE_URL,
  DEFAULT_REALTIME_MODEL,
  DEFAULT_SAMPLE_RATE_HZ,
  DEFAULT_VOICE,
  buildCantoneseRealtimeSession,
  realtimeAuthHeaders,
  realtimeWebSocketUrl,
} from "./realtime-chat/cantoneseConfig.js";

export {
  RealtimeChatClient,
  base64ToInt16,
  int16ToBase64,
} from "./realtime-chat/realtimeClient.js";

export {
  SAKURA_EXPRESSION_PRESETS,
  SAKURA_PARAMETER_IDS,
  inferExpressionFromText,
  lipSyncParameters,
  mouthOpenFromPcm16,
} from "./face-live/expressions.js";

export {
  SakuraFaceLiveDriver,
  type FaceLiveDriverEvents,
  type FaceLiveEventName,
  type FaceLiveListener,
  type SakuraFaceLiveOptions,
} from "./face-live/sakuraDriver.js";

export {
  VoiceBridge,
  float32ToPcm16,
  mergePcm16,
  pcm16ToFloat32,
  type VoiceBridgeOptions,
} from "./voice-bridge/voiceBridge.js";

export {
  AmojiOrchestrator,
  type AmojiOrchestratorOptions,
} from "./orchestrator/orchestrator.js";
