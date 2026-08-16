/**
 * Browser/Node JS engine surface for Amoji always-on listen.
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
