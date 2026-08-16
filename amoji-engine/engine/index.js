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
