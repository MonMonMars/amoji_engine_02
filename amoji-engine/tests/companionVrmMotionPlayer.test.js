import { describe, expect, it } from "vitest";
import {
  applyMotionActionCrossfade,
  COMPANION_VRM_MOTION_PLAYER_SCHEMA,
} from "../engine/companion/companionVrmMotionPlayer.js";
import { ONLINE_CALM_IDLE_ACTION } from "../engine/companion/companionOnlineMotionClips.mjs";
import { DEFAULT_MOTION_CROSSFADE_SEC } from "../engine/companion/vrmMotionTransition.js";

function mockAction() {
  let weight = 1;
  return {
    paused: false,
    reset() {
      this._reset = true;
    },
    play() {
      this._playing = true;
    },
    setEffectiveWeight(w) {
      weight = w;
    },
    getEffectiveWeight() {
      return weight;
    },
    isRunning() {
      return Boolean(this._playing);
    },
    crossFadeFrom() {
      this._crossfaded = true;
    },
    fadeIn() {
      this._fadedIn = true;
    },
  };
}

describe("companionVrmMotionPlayer", () => {
  it("uses v6 schema and shares crossfade timing with transition module", () => {
    expect(COMPANION_VRM_MOTION_PLAYER_SCHEMA).toBe(
      "amoji.companionVrmMotionPlayer.v6",
    );
    expect(DEFAULT_MOTION_CROSSFADE_SEC).toBeCloseTo(0.6);
    expect(ONLINE_CALM_IDLE_ACTION).toBe("thinking");
  });

  it("applyMotionActionCrossfade starts at weight 0 and crossfades", () => {
    const prev = mockAction();
    const next = mockAction();
    const { crossfadingIn } = applyMotionActionCrossfade({
      previousAction: prev,
      nextAction: next,
      transitionSec: 0.5,
    });
    expect(crossfadingIn).toBe(true);
    expect(next.getEffectiveWeight()).toBe(0);
    expect(next._crossfaded).toBe(true);
    expect(next._fadedIn).toBeUndefined();
  });

  it("applyMotionActionCrossfade fadeIn when no previous clip", () => {
    const next = mockAction();
    const { crossfadingIn } = applyMotionActionCrossfade({
      previousAction: null,
      nextAction: next,
      transitionSec: 0.5,
    });
    expect(crossfadingIn).toBe(false);
    expect(next.getEffectiveWeight()).toBe(0);
    expect(next._fadedIn).toBe(true);
  });
});
