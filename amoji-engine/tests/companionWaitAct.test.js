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
    expect(voice.startLearnLoop).toHaveBeenCalled();

    wait.update({ progress: 0.55, phase: "learning" });
    expect(progress.update).toHaveBeenCalled();
    expect(voice.updateLearnLoop).toHaveBeenCalled();

    wait.stop();
    expect(progress.hide).toHaveBeenCalled();
    expect(voice.stopLearnLoop).toHaveBeenCalled();
    expect(wait.isActive()).toBe(false);
  });

  it("replays pose when avatar becomes available mid-wait", () => {
    const avatar = {
      playAction: vi.fn(),
      setEmotion: vi.fn(),
      setThinking: vi.fn(),
    };
    const wait = createCompanionWaitAct({ avatar: null, isEnglish: false });
    wait.start({ kind: "avatar-load", phase: "wave", speak: false });
    expect(avatar.playAction).not.toHaveBeenCalled();
    wait.setAvatar(avatar);
    expect(avatar.playAction).toHaveBeenCalled();
  });
});
