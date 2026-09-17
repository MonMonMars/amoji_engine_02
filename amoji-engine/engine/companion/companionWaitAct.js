/**
 * Companion wait performance — progress UI + rotating poses + learn dialogue.
 */
import {
  learnPhaseForProgress,
  resolveWaitDialoguePhase,
} from "./companionLearnDialogue.js";
import { progressPhaseLabel } from "./companionProgressOverlay.js";
import {
  pickWaitEmotion,
  pickWaitExpressionProfile,
  pickWaitPose,
  WAIT_POSES_BY_PHASE,
} from "./companionWaitAssets.js";

export const COMPANION_WAIT_ACT_SCHEMA = "amoji.companionWaitAct.v1";

/** @typedef {'connecting'|'searching'|'downloading'|'learning'|'installing'|'ready'|'failed'|'thinking'|'avatar-load'|'character-switch'|'motion-pack'|'idle'} WaitPhase */

export { WAIT_POSES_BY_PHASE, pickWaitPose };

/**
 * @param {{
 *   avatar?: {
 *     playAction?: (id: string, opts?: object) => void,
 *     playActionSequence?: (ids: string[], opts?: object) => void,
   *     setEmotion?: (e: string) => void,
   *     applyExpressionProfile?: (profile: object) => void,
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
  let isEnglish = Boolean(opts.isEnglish);
  let poseIntervalMs = opts.poseIntervalMs ?? 3600;
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
  /** @type {string | null} */
  let lastPoseId = null;

  const playPose = () => {
    const expression = pickWaitExpressionProfile(phase, poseTick, kind);
    const emotion = expression.emotion || pickWaitEmotion(phase, poseTick, kind);
    avatarRef?.setEmotion?.(emotion);
    avatarRef?.applyExpressionProfile?.(expression);

    if (kind === "avatar-load") {
      // Play preloaded procedural gestures as soon as the live model exists.
      avatarRef?.setThinking?.(false);
      const pose = pickWaitPose("avatar-load", poseTick);
      lastPoseId = pose;
      avatarRef?.playAction?.(pose, {
        emotion,
        loop: false,
        single: true,
      });
      opts.onPose?.(pose, phase);
      return;
    }

    if (kind === "idle") {
      // Living rest pose is procedural (bent elbows, weight shift).
      // One-shot showcase actions flatten limbs back to a stick stand.
      lastPoseId = "idle-stand";
      avatarRef?.setThinking?.(false);
      opts.onPose?.("idle-stand", phase);
      return;
    }

    const pose = pickWaitPose(phase, poseTick);
    lastPoseId = pose;
    avatarRef?.playAction?.(pose, {
      emotion,
      loop: false,
      single: true,
    });
    avatarRef?.setThinking?.(emotion === "thinking");
    opts.onPose?.(pose, phase);
  };

  const syncProgressUi = (label) => {
    const resolvedPhase =
      phase || (progress > 0 ? learnPhaseForProgress(progress) : "learning");
    const showProgress = kind !== "idle";
    if (!showProgress) return;
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
    const interval =
      kind === "idle" || kind === "avatar-load"
        ? Math.max(1600, Math.round(poseIntervalMs * 0.48))
        : kind === "thinking"
          ? Math.max(poseIntervalMs, 4200)
          : poseIntervalMs;
    poseTimer = setInterval(() => {
      if (!active) return;
      poseTick += 1;
      playPose();
    }, interval);
  };

  const stopPoseRotation = () => {
    if (poseTimer) clearInterval(poseTimer);
    poseTimer = null;
  };

  const startWaitVoice = (speak) => {
    if (!speak) return;
    if (kind === "thinking") {
      voiceRef?.startThinkingLoop?.({ isEnglish, intervalMs: 5200 });
      return;
    }
    if (
      kind === "motion" ||
      kind === "download" ||
      kind === "motion-pack" ||
      kind === "avatar-load" ||
      kind === "idle"
    ) {
      voiceRef?.startLearnLoop?.({
        isEnglish,
        phase: resolveWaitDialoguePhase(kind, phase, progress),
        progress,
      });
    }
  };

  const stopWaitVoice = () => {
    voiceRef?.stopLearnLoop?.();
    if (kind === "thinking") voiceRef?.stopThinkingLoop?.();
  };

  const maybeAnnounceProgress = () => {
    const pct = Math.round(progress * 100);
    if (pct - lastAnnouncedPct < 12) return;
    lastAnnouncedPct = pct;
    voiceRef?.updateLearnLoop?.({ phase: "progress", progress });
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

      const speak = ctx.speak !== false;
      const showProgress = kind !== "idle";

      if (showProgress) {
        opts.progress?.show?.({
          progress,
          phase: progressPhaseLabel(phase, isEnglish),
          label: ctx.label,
          indeterminate,
        });
      }

      startWaitVoice(speak);
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
        phase: resolveWaitDialoguePhase(kind, phase, progress),
        progress,
      });
      if (kind === "motion" || kind === "download" || kind === "motion-pack") {
        maybeAnnounceProgress();
      }
    },
    setAvatar(next) {
      avatarRef = next || null;
      if (active && avatarRef) playPose();
    },
    setVoice(next) {
      voiceRef = next || null;
    },
    setLocale(nextEnglish) {
      isEnglish = Boolean(nextEnglish);
    },
    stop() {
      if (!active) return;
      const stoppingKind = kind;
      active = false;
      stopPoseRotation();
      stopWaitVoice();
      avatarRef?.setThinking?.(false);
      avatarRef?.stopAction?.();
      if (stoppingKind !== "idle") opts.progress?.hide?.();
      kind = "";
      phase = "learning";
      progress = 0;
      indeterminate = false;
    },
  };
}
