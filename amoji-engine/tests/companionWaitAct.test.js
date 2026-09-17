import { describe, expect, it, vi } from "vitest";
import {
  createCompanionWaitAct,
  pickWaitPose,
  WAIT_POSES_BY_PHASE,
} from "../engine/companion/companionWaitAct.js";

describe("companionWaitAct", () => {
  it("rotates wait poses by phase", () => {
    expect(WAIT_POSES_BY_PHASE.downloading).toContain("downloading");
    expect(pickWaitPose("downloading", 0)).toBe("downloading");
    expect(pickWaitPose("downloading", 1)).toBe("learning");
  });

  it("starts and stops wait performance with progress updates", () => {
    const avatar = {
      playAction: vi.fn(),
      setEmotion: vi.fn(),
      setThinking: vi.fn(),
    };
    const voice = {
      startLearnLoop: vi.fn(),
      updateLearnLoop: vi.fn(),
      stopLearnLoop: vi.fn(),
    };
    const progress = {
      show: vi.fn(),
      update: vi.fn(),
      hide: vi.fn(),
    };

    const wait = createCompanionWaitAct({
      avatar,
      voice,
      progress,
      isEnglish: true,
    });

    wait.start({
      kind: "motion",
      phase: "downloading",
      progress: 0.2,
      label: "Downloading breakdance…",
    });
    expect(progress.show).toHaveBeenCalled();
    expect(avatar.playAction).toHaveBeenCalled();
    expect(voice.startLearnLoop).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: "motion",
        progress: 0.2,
      }),
    );

    wait.update({ progress: 0.55, phase: "learning" });
    expect(progress.update).toHaveBeenCalled();
    expect(voice.updateLearnLoop).toHaveBeenCalled();

    wait.stop();
    expect(progress.hide).toHaveBeenCalled();
    expect(voice.stopLearnLoop).toHaveBeenCalled();
    expect(wait.isActive()).toBe(false);
  });

  it("holds library idle when the avatar becomes available during load", () => {
    const avatar = {
      playAction: vi.fn(),
      setEmotion: vi.fn(),
      setThinking: vi.fn(),
      stopAction: vi.fn(),
      applyExpressionProfile: vi.fn(),
    };
    const wait = createCompanionWaitAct({ avatar: null, isEnglish: false });
    wait.start({ kind: "avatar-load", phase: "avatar-load", speak: false });
    expect(avatar.playAction).not.toHaveBeenCalled();
    wait.setAvatar(avatar);
    expect(avatar.playAction).not.toHaveBeenCalled();
    expect(avatar.setEmotion).toHaveBeenCalledWith("neutral");
    expect(avatar.stopAction).not.toHaveBeenCalled();
  });

  it("keeps the living rest pose while idle instead of one-shot actions", () => {
    const avatar = {
      playAction: vi.fn(),
      setEmotion: vi.fn(),
      setThinking: vi.fn(),
      stopAction: vi.fn(),
      applyExpressionProfile: vi.fn(),
      resetIdleLife: vi.fn(),
    };
    const wait = createCompanionWaitAct({ avatar, isEnglish: true });
    wait.start({ kind: "idle", phase: "idle", speak: false });
    expect(avatar.stopAction).not.toHaveBeenCalled();
    expect(avatar.playAction).not.toHaveBeenCalled();
    expect(avatar.resetIdleLife).toHaveBeenCalled();
    expect(avatar.setEmotion).toHaveBeenCalledWith("neutral");
    wait.stop();
  });

  it("pulses look/comb idle life on later idle ticks without playing VRMA", () => {
    vi.useFakeTimers();
    const avatar = {
      playAction: vi.fn(),
      setEmotion: vi.fn(),
      setThinking: vi.fn(),
      stopAction: vi.fn(),
      applyExpressionProfile: vi.fn(),
      resetIdleLife: vi.fn(),
      pulseIdleBeat: vi.fn(),
    };
    const wait = createCompanionWaitAct({
      avatar,
      isEnglish: true,
      poseIntervalMs: 2000,
    });
    wait.start({ kind: "idle", phase: "idle", speak: false });
    expect(avatar.pulseIdleBeat).not.toHaveBeenCalled();
    vi.advanceTimersByTime(2000);
    expect(avatar.playAction).not.toHaveBeenCalled();
    expect(avatar.pulseIdleBeat).toHaveBeenCalled();
    wait.stop();
    vi.useRealTimers();
  });
});
