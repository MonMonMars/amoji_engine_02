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
  RealtimeSessionWire,
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
  toRealtimeSessionWire,
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
  smoothMouthOpen,
} from "./face-live/expressions.js";

export {
  IDLE_PRESENCE_SCHEMA,
  presenceToFaceLiveParams,
  type IdlePresenceSample,
} from "./face-live/idlePresence.js";

export {
  SakuraFaceLiveDriver,
  type FaceLiveDriverEvents,
  type FaceLiveEventName,
  type FaceLiveListener,
  type SakuraFaceLiveOptions,
} from "./face-live/sakuraDriver.js";

export {
  startMockFaceLiveBridge,
  type MockFaceLiveBridge,
  type MockFaceLiveBridgeOptions,
} from "./face-live/mockBridge.js";

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
