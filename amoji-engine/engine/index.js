/**
 * Browser/Node JS engine surface for Amoji always-on listen + voice chat orchestrator.
 * TypeScript package entry remains `src/index.ts` → `dist/`.
 */

export {
  ALWAYS_ON_LISTEN_SCHEMA,
  AlwaysOnListenController,
  createAlwaysOnListen,
  createUtteranceDetector,
  frameEnergy,
  resolveAlwaysOnListenOptions,
} from "./voice/alwaysOnListen.js";

export {
  VoiceChatOrchestrator,
  createVoiceChatOrchestrator,
} from "./voice/voiceChatOrchestrator.js";

export {
  ROBOT_EVENTS,
  createVoiceRobotBridge,
  extractRememberedName,
  planRobotSteps,
} from "./voice/voiceRobotBridge.js";

export {
  DIALECT_DETECT_SCHEMA,
  detectLanguage,
  stripAsrTags,
} from "./voice/dialect.js";

export {
  PROSODY_MARKERS_SCHEMA,
  parseProsodyMarkers,
  applyProsodyMarkerOverrides,
  resolveProsody,
  prosodyFromMarkedText,
} from "./voice/prosodyMarkers.js";

export {
  SENSE_VOICE_SCHEMA,
  parseSenseVoiceTranscript,
  emotionFromTextHeuristics,
  emotionFromSenseVoice,
} from "./voice/senseVoice.js";

export {
  VOICE_WORKER_SCHEMA,
  callVoiceWorker,
  callVoiceWorkerHealth,
  callVoiceWorkerTtsStream,
  mockAsr,
  mockTtsStream,
  createVoiceWorkerClient,
} from "./voice/voiceWorkerClient.js";

export {
  createPartialAsrWatcher,
  snapshotMicWavBase64,
} from "./voice/partialAsr.js";

export {
  createMicFrameBuffer,
} from "./voice/micFrameBuffer.js";

export {
  WORKER_TURN_SCHEMA,
  runWorkerRobotTurn,
  createWorkerTurnHost,
} from "./voice/workerTurnPipeline.js";

export {
  BROWSER_AUDIO_SCHEMA,
  encodeWavPcm16,
  arrayBufferToBase64,
  base64ToBytes,
  synthesizeWavBase64,
  downsampleMono,
  TtsChunkPlayer,
  createTtsPlaybackQueue,
  decodeChunkToAudioBuffer,
} from "./voice/browserAudio.js";

export {
  IDLE_PRESENCE_SCHEMA,
  IDLE_FACE_LIVE_IDS,
  sampleIdlePresence,
  presenceToFaceLiveParams,
  IdlePresenceClock,
  createIdlePresenceClock,
} from "./face/idlePresence.js";

export {
  LIP_SYNC_SCHEMA,
  LIP_SYNC_PARAM_IDS,
  mouthOpenFromPcm,
  smoothMouthOpen,
  decodePcmBase64ToFloat32,
  lipSyncParamsFromChunk,
  createLipSyncTracker,
} from "./face/lipSyncFromChunk.js";

export {
  FACE_LIVE_CLIENT_SCHEMA,
  SAKURA_PARAM_IDS,
  SAKURA_EXPRESSION_PRESETS,
  createSakuraFaceLiveClient,
} from "./face/sakuraFaceLiveClient.js";

export {
  startMockFaceLiveBridge,
} from "./face/mockFaceLiveBridge.js";

export {
  SESSION_ARCHIVE_KIND,
  SESSION_ARCHIVE_SCHEMA_VERSION,
  applySessionArchive,
  buildSessionArchive,
  createLabChat,
  createLabSessionFacade,
  createTickRecorder,
  downloadSessionArchiveJson,
  exportSessionArchive,
  importSessionArchive,
  parseSessionArchive,
} from "./lab/sessionArchive.js";

export {
  WORKER_URL_STORAGE_KEY,
  resolveVoiceWorkerConfig,
} from "./lab/workerUrl.js";

export {
  FACE_LIVE_URL_STORAGE_KEY,
  resolveFaceLiveConfig,
} from "./lab/faceLiveUrl.js";

export {
  DIALECT_PREF_SCHEMA,
  DIALECT_PREF_STORAGE_KEY,
  normalizeDialectMode,
  nextDialectMode,
  persistDialectPref,
  resolveDialectPref,
} from "./lab/dialectPref.js";

export {
  TURN_METRICS_ROLLUP_SCHEMA,
  createTurnMetricsRollup,
  normalizeTurnMetrics,
  percentileNearest,
  summarizeSeries,
} from "./lab/turnMetricsRollup.js";
