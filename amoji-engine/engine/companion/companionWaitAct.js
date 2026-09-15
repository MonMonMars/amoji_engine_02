/**
 * Companion wait performance — progress UI + rotating poses + learn dialogue.
 */
import { learnPhaseForProgress } from "./companionLearnDialogue.js";
import { progressPhaseLabel } from "./companionProgressOverlay.js";

export const COMPANION_WAIT_ACT_SCHEMA = "amoji.companionWaitAct.v1";

/** @typedef {'connecting'|'searching'|'downloading'|'learning'|'installing'|'ready'|'failed'|'thinking'|'avatar-load'|'character-switch'|'motion-pack'} WaitPhase */

/** @type {Record<string, readonly string[]>} */
export const WAIT_POSES_BY_PHASE = Object.freeze({
  connecting: ["wave", "thinking", "nod", "bow"],
  searching: ["thinking", "nod", "learning", "wave"],
  downloading: ["downloading", "learning", "wave", "thinking"],
  learning: ["learning", "thinking", "nod", "wave", "bow"],
  installing: ["nod", "learning", "thinking", "wave"],
  thinking: ["thinking", "nod", "wave", "learning", "bow"],
  "avatar-load": ["wave", "learning", "downloading", "thinking", "nod"],
  "character-switch": ["wave", "celebrate", "nod", "clap", "bow"],
  "motion-pack": ["downloading", "learning", "wave", "thinking", "nod"],
  ready: ["celebrate", "wave", "clap", "nod"],
});

/**
 * @param {string} phase
 * @param {number} [tick]
 */
export function pickWaitPose(phase, tick = 0) {
  const list = WAIT_POSES_BY_PHASE[phase] || WAIT_POSES_BY_PHASE.learning;
  return list[Math.abs(tick) % list.length];
}

/**
 * @param {{
 *   avatar?: {
 *     playAction?: (id: string, opts?: object) => void,
 *     playActionSequence?: (ids: string[], opts?: object) => void,
 *     setEmotion?: (e: string) => void,
 *     setThinking?: (on: boolean) => void,
 *     stopAction?: () => void,
 *   } | null,
 *   voice?: {
 *     startLearnLoop?: (opts?: object) => void,
 *     updateLearnLoop?: (opts?: object) => void,
 *     stopLearnLoop?: () => void,
 *     startThinkingLoop?: (opts?: object) => void,
 *     stopThinkingLoop?: () => void,
 *   } | null,
 *   progress?: {
 *     show?: (ctx: object) => void,
 *     update?: (ctx: object) => void,
 *     hide?: () => void,
 *   } | null,
 *   isEnglish?: boolean,
 *   poseIntervalMs?: number,
 *   onPose?: (pose: string, phase: string) => void,
 * }} opts
 */
export function createCompanionWaitAct(opts = {}) {
  const isEnglish = Boolean(opts.isEnglish);
  const poseIntervalMs = opts.poseIntervalMs ?? 2800;
  let avatarRef = opts.avatar || null;
  let voiceRef = opts.voice || null;
  let active = false;
  let kind = "";
  /** @type {WaitPhase | string} */
  let phase = "learning";
  let progress = 0;
  let poseTick = 0;
  let indeterminate = false;
  /** @type {ReturnType<typeof setInterval> | null} */
  let poseTimer = null;
  let lastAnnouncedPct = -1;

  const playPose = () => {
    const pose = pickWaitPose(phase, poseTick);
    avatarRef?.playAction?.(pose, { emotion: "thinking", loop: true, loopSequence: true });
    avatarRef?.setEmotion?.("thinking");
    avatarRef?.setThinking?.(true);
    opts.onPose?.(pose, phase);
  };

  const syncProgressUi = (label) => {
    const resolvedPhase =
      phase || (progress > 0 ? learnPhaseForProgress(progress) : "learning");
    opts.progress?.update?.({
      progress,
      phase: progressPhaseLabel(resolvedPhase, isEnglish),
      label:
        label ||
        (isEnglish
          ? "Please wait — I'm getting ready…"
          : "等陣呀，我準備緊…"),
      indeterminate,
    });
  };

  const startPoseRotation = () => {
    clearInterval(poseTimer);
    poseTimer = setInterval(() => {
      if (!active) return;
      poseTick += 1;
      playPose();
    }, poseIntervalMs);
  };

  const stopPoseRotation = () => {
    if (poseTimer) clearInterval(poseTimer);
    poseTimer = null;
  };

  const maybeAnnounceProgress = () => {
    const pct = Math.round(progress * 100);
    if (pct - lastAnnouncedPct < 12) return;
    lastAnnouncedPct = pct;
    opts.voice?.updateLearnLoop?.({ phase: "progress", progress });
  };

  return {
    schema: COMPANION_WAIT_ACT_SCHEMA,
    isActive() {
      return active;
    },
    get state() {
      return { active, kind, phase, progress, indeterminate };
    },
    /**
     * @param {{
     *   kind: string,
     *   phase?: string,
     *   progress?: number,
     *   label?: string,
     *   actionId?: string,
     *   indeterminate?: boolean,
     *   speak?: boolean,
     * }} ctx
     */
    start(ctx) {
      active = true;
      kind = ctx.kind || "wait";
      phase = ctx.phase || (kind === "thinking" ? "thinking" : "learning");
      progress = ctx.progress ?? 0;
      indeterminate = Boolean(ctx.indeterminate);
      poseTick = 0;
      lastAnnouncedPct = -1;

      opts.progress?.show?.({
        progress,
        phase: progressPhaseLabel(phase, isEnglish),
        label: ctx.label,
        indeterminate,
      });

      const speak = ctx.speak !== false;
      if (speak && kind === "thinking") {
        voiceRef?.startThinkingLoop?.({ isEnglish, intervalMs: 2000 });
      } else if (speak && (kind === "motion" || kind === "download" || kind === "motion-pack")) {
        voiceRef?.startLearnLoop?.({
          isEnglish,
          phase: learnPhaseForProgress(progress) || phase,
          progress,
        });
      }

      playPose();
      startPoseRotation();
      syncProgressUi(ctx.label);
    },
    /**
     * @param {{
     *   phase?: string,
     *   progress?: number,
     *   label?: string,
     *   indeterminate?: boolean,
     * }} ctx
     */
    update(ctx = {}) {
      if (!active) return;
      if (ctx.phase) {
        if (ctx.phase !== phase) {
          phase = ctx.phase;
          poseTick = 0;
          playPose();
        }
      } else if (ctx.progress != null) {
        const derived = learnPhaseForProgress(ctx.progress);
        if (derived !== phase && kind !== "thinking") {
          phase = derived;
          poseTick = 0;
          playPose();
        }
      }
      if (ctx.progress != null) progress = ctx.progress;
      if (ctx.indeterminate != null) indeterminate = Boolean(ctx.indeterminate);
      syncProgressUi(ctx.label);
      voiceRef?.updateLearnLoop?.({
        phase: learnPhaseForProgress(progress) || phase,
        progress,
      });
      if (kind === "motion" || kind === "download" || kind === "motion-pack") {
        maybeAnnounceProgress();
      }
    },
    setAvatar(next) {
      avatarRef = next || null;
    },
    setVoice(next) {
      voiceRef = next || null;
    },
    stop() {
      if (!active) return;
      active = false;
      stopPoseRotation();
      voiceRef?.stopLearnLoop?.();
      if (kind === "thinking") voiceRef?.stopThinkingLoop?.();
      avatarRef?.setThinking?.(false);
      avatarRef?.stopAction?.();
      opts.progress?.hide?.();
      kind = "";
      phase = "learning";
      progress = 0;
      indeterminate = false;
    },
  };
}
