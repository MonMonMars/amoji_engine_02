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
  IDLE_PRESENCE_SCHEMA,
  IDLE_FACE_LIVE_IDS,
  sampleIdlePresence,
  presenceToFaceLiveParams,
  IdlePresenceClock,
  createIdlePresenceClock,
} from "./face/idlePresence.js";

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
