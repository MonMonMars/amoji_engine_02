/**
 * Companion wait performance — progress UI + rotating poses + learn dialogue.
 */
import {
  isLoadingWaitKind,
  learnPhaseForProgress,
  resolveWaitDialoguePhase,
} from "./companionLearnDialogue.js";
import { progressPhaseLabel } from "./companionProgressOverlay.js";
import {
  idleLifeClipPoolForGender,
  pickIdleShowcase,
} from "./companionActionChoreography.js";
import { pickProceduralIdleBeat } from "./companionIdleMotion.js";
import {
  pickWaitEmotion,
  pickWaitExpressionProfile,
  pickWaitPose,
  WAIT_POSES_BY_PHASE,
} from "./companionWaitAssets.js";

export const COMPANION_WAIT_ACT_SCHEMA = "amoji.companionWaitAct.v2";

/** One-shot library clips need room to finish (wave ~1.8s, thinking ~2.4s). */
export const IDLE_LIFE_INTERVAL_MS = 2100;
export const AVATAR_LOAD_IDLE_INTERVAL_MS = 900;
/** Play a showcase clip every N idle ticks — procedural beats on the others. */
export const IDLE_LIFE_CLIP_EVERY_N_TICKS = 2;
/** Thinking fillers while any load / download wait is active. */
export const LOADING_THINKING_VOICE_INTERVAL_MS = 4800;
/** @typedef {'connecting'|'waking'|'searching'|'assembling'|'downloading'|'warming'|'learning'|'installing'|'settling'|'almost'|'ready'|'failed'|'thinking'|'avatar-load'|'character-switch'|'motion-pack'|'idle'} WaitPhase */

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
 *     resetIdleLife?: (now?: number) => void,
 *     playCalmIdle?: () => void | Promise<boolean>,
 *     pulseIdleBeat?: (beat: string) => void,
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
 *   getIdleGender?: () => "female" | "male" | string,
 *   poseIntervalMs?: number,
 *   onPose?: (pose: string, phase: string) => void,
 * }} opts
 */
export function createCompanionWaitAct(opts = {}) {
  let isEnglish = Boolean(opts.isEnglish);
  let getIdleGender =
    typeof opts.getIdleGender === "function"
      ? opts.getIdleGender
      : () => "female";
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
  /** @type {string | null} */
  let lastPoseId = null;

  const usesThinkingVoice = (waitKind = kind) =>
    waitKind === "thinking" || isLoadingWaitKind(waitKind);

  const playAvatarLoadIdle = () => {
    // Hosted Relax loop when the avatar is ready; expressions only while loading.
    lastPoseId = "idle-stand";
    avatarRef?.setThinking?.(false);
    if (poseTick === 0) {
      avatarRef?.resetIdleLife?.();
      avatarRef?.setEmotion?.("neutral");
      avatarRef?.applyExpressionProfile?.({
        emotion: "neutral",
        nuance: "none",
      });
    } else {
      avatarRef?.playCalmIdle?.();
    }
    opts.onPose?.("idle-stand", phase);
  };

  const playIdleLife = () => {
    // Thinking.vrma calm loop + occasional one-shot social clips (crossfaded).
    avatarRef?.setThinking?.(false);
    avatarRef?.setEmotion?.("neutral");
    const idleExpression = pickWaitExpressionProfile(phase, poseTick, kind);
    if (poseTick === 0) {
      avatarRef?.resetIdleLife?.();
      avatarRef?.setEmotion?.(idleExpression.emotion || "neutral");
      avatarRef?.applyExpressionProfile?.(idleExpression);
      avatarRef?.pulseIdleBeat?.("breathe");
      opts.onPose?.("idle-stand", phase);
      return;
    }

    avatarRef?.setEmotion?.(idleExpression.emotion || "neutral");
    avatarRef?.applyExpressionProfile?.(idleExpression);

    const idleGender = getIdleGender();

    if (poseTick % IDLE_LIFE_CLIP_EVERY_N_TICKS !== 0) {
      const beat = pickProceduralIdleBeat(poseTick, idleGender);
      avatarRef?.pulseIdleBeat?.(beat);
      opts.onPose?.(`idle-${beat}`, phase);
      return;
    }

    const lifePool = idleLifeClipPoolForGender(idleGender);
    const pose = pickIdleShowcase(lastPoseId, lifePool, idleGender);
    lastPoseId = pose;
    avatarRef?.playAction?.(pose, {
      emotion: "neutral",
      loop: false,
      single: true,
    });
    opts.onPose?.(pose, phase);
  };

  const playPose = () => {
    if (kind === "avatar-load") {
      playAvatarLoadIdle();
      return;
    }
    if (kind === "idle") {
      playIdleLife();
      return;
    }

    const expression = pickWaitExpressionProfile(phase, poseTick, kind);
    const emotion = expression.emotion || pickWaitEmotion(phase, poseTick, kind);
    avatarRef?.setEmotion?.(emotion);
    avatarRef?.applyExpressionProfile?.(expression);

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
      kind === "idle"
        ? IDLE_LIFE_INTERVAL_MS
        : kind === "avatar-load"
          ? AVATAR_LOAD_IDLE_INTERVAL_MS
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
    if (kind === "idle") {
      voiceRef?.startLearnLoop?.({
        isEnglish,
        kind,
        phase: "idle",
        progress: 0,
        intervalMs: 5600,
      });
      return;
    }
    if (usesThinkingVoice()) {
      voiceRef?.stopLearnLoop?.();
      voiceRef?.startThinkingLoop?.({
        isEnglish,
        intervalMs:
          kind === "thinking" ? 5200 : LOADING_THINKING_VOICE_INTERVAL_MS,
      });
    }
  };

  const stopWaitVoice = () => {
    voiceRef?.stopLearnLoop?.();
    voiceRef?.stopThinkingLoop?.();
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

      const speak = ctx.speak !== false;
      const showProgress = kind !== "idle";

      if (kind === "idle") {
        avatarRef?.stopAction?.();
      }

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
      if (ctx.progress != null) progress = ctx.progress;
      if (ctx.phase === "failed") {
        if (phase !== "failed") {
          phase = "failed";
          poseTick = 0;
          playPose();
        }
      } else if (ctx.progress != null && kind !== "thinking" && kind !== "idle") {
        const derived = learnPhaseForProgress(progress);
        if (derived !== phase) {
          phase = derived;
          poseTick = 0;
          playPose();
        }
      } else if (ctx.phase && ctx.phase !== phase) {
        phase = ctx.phase;
        poseTick = 0;
        playPose();
      }
      if (ctx.indeterminate != null) indeterminate = Boolean(ctx.indeterminate);
      syncProgressUi(ctx.label);
      if (kind === "idle") {
        voiceRef?.updateLearnLoop?.({
          phase: resolveWaitDialoguePhase(kind, phase, progress),
          progress,
        });
      }
    },
    setAvatar(next) {
      avatarRef = next || null;
      if (active && avatarRef) playPose();
    },
    /** Turn on filler speech after the greeting (avatar-load / idle). */
    enableVoice() {
      if (!active) return false;
      startWaitVoice(true);
      return true;
    },
    setVoice(next) {
      voiceRef = next || null;
    },
    setLocale(nextEnglish) {
      isEnglish = Boolean(nextEnglish);
    },
    setIdleGenderResolver(fn) {
      getIdleGender = typeof fn === "function" ? fn : () => "female";
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
    /** Force the next idle pose/clip (used by the companion idle ticker). */
    nudgePose() {
      if (!active || kind !== "idle") return false;
      poseTick += 1;
      playPose();
      return true;
    },
  };
}
