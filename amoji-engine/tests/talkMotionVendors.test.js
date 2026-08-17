import { describe, expect, it } from "vitest";
import {
  ROBOT_MOTION_VENDORS,
  SOFTBANK_STYLE_MAP,
  buildRobotMotionPackage,
  annotateSoftbankSpeech,
  createRobotMotionAdapter,
  nextRobotMotionVendor,
  normalizeRobotMotionVendor,
  formatRobotMotionHud,
} from "../engine/robot/talkMotion.js";
import { createVoiceRobotBridge } from "../engine/voice/voiceRobotBridge.js";

describe("robot talkMotion vendors", () => {
  it("normalizes vendor aliases", () => {
    expect(normalizeRobotMotionVendor("pepper")).toBe("softbank");
    expect(normalizeRobotMotionVendor("naoqi")).toBe("softbank");
    expect(normalizeRobotMotionVendor("g1")).toBe("unitree_g1");
    expect(normalizeRobotMotionVendor("pollen")).toBe("reachy");
    expect(nextRobotMotionVendor("sakura")).toBe("softbank");
    expect(ROBOT_MOTION_VENDORS).toContain("furhat");
  });

  it("maps talk styles onto SoftBank NAOqi tags and annotated speech", () => {
    const pkg = buildRobotMotionPackage({
      style: "wave",
      text: "早晨",
      vendor: "softbank",
    });
    expect(pkg.vendor).toBe("softbank");
    expect(pkg.softbank.tag).toBe("hello");
    expect(pkg.softbank.run).toContain("Hey_1");
    expect(pkg.softbank.annotatedSay).toContain("^start(");
    expect(annotateSoftbankSpeech("hi", "wave")).toContain("Hey_1");
    expect(SOFTBANK_STYLE_MAP.point.tag).toBe("indicate");
    expect(SOFTBANK_STYLE_MAP.thinking.tag).toBe("think");
  });

  it("builds Furhat / Reachy / Unitree / ROS / Sakura packages", () => {
    const furhat = buildRobotMotionPackage({
      text: "睇下呢個",
      vendor: "furhat",
    });
    expect(furhat.style).toBe("point");
    expect(furhat.furhat.name).toBeTruthy();
    expect(furhat.furhat.definition.frames.length).toBeGreaterThan(0);

    const reachy = buildRobotMotionPackage({
      style: "point",
      vendor: "reachy",
    });
    expect(reachy.reachy.r_arm).toHaveLength(7);
    expect(reachy.reachy.l_arm).toHaveLength(7);

    const g1 = buildRobotMotionPackage({
      style: "celebrate",
      vendor: "unitree_g1",
    });
    expect(g1.unitree_g1.joints.right_shoulder_pitch).toBeGreaterThan(0.5);

    const ros = buildRobotMotionPackage({ style: "explain", vendor: "ros" });
    expect(ros.ros.name.length).toBe(ros.ros.position.length);

    const sakura = buildRobotMotionPackage({
      style: "point",
      vendor: "sakura",
    });
    expect(
      sakura.sakura.parameters.some((p) => p.id === "ParamFingerRIndexTip"),
    ).toBe(true);
  });

  it("adapter cycles vendors and robot bridge attaches motion", async () => {
    const adapter = createRobotMotionAdapter({ vendor: "softbank" });
    expect(adapter.fromText("拜拜").softbank.tag).toBe("hello");
    expect(adapter.cycleVendor()).toBe("furhat");

    const robot = createVoiceRobotBridge({ motionVendor: "reachy" });
    const turn = await robot.runTurn("睇下呢個", {
      forceReply: "睇下呢度呀！",
    });
    expect(robot.motionVendor).toBe("reachy");
    expect(turn.motion.vendor).toBe("reachy");
    expect(turn.motion.style).toBe("point");
    expect(turn.steps.some((s) => String(s).startsWith("motion:reachy"))).toBe(
      true,
    );
    expect(formatRobotMotionHud(turn.motion)).toContain("reachy");

    robot.setMotionVendor("unitree_g1");
    const g1Turn = await robot.runTurn("哈哈好開心");
    expect(g1Turn.motion.vendor).toBe("unitree_g1");
    expect(g1Turn.motion.unitree_g1.joints).toBeTruthy();
  });
});
