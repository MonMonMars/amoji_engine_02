import { describe, expect, it, vi } from "vitest";
import {
  createVoiceRobotBridge,
  extractRememberedName,
  planRobotSteps,
} from "../engine/voice/voiceRobotBridge.js";

describe("createVoiceRobotBridge", () => {
  it("extracts and recalls name 小明 across turns", async () => {
    expect(extractRememberedName("我叫小明")).toBe("小明");
    const robot = createVoiceRobotBridge();
    const first = await robot.runTurn("我叫小明");
    expect(robot.memory.userName).toBe("小明");
    expect(first.reply).toMatch(/小明/);

    const second = await robot.runTurn("我叫咩名？");
    expect(second.reply).toMatch(/小明/);
    expect(second.steps[0]).toBe("recall_name:小明");
  });

  it("emits sakura → lip_sync → done and updates HUD", async () => {
    const events = [];
    const robot = createVoiceRobotBridge();
    for (const ev of ["sakura", "lip_sync", "done", "aborted"]) {
      robot.on(ev, (p) => events.push({ ev, phase: p.phase, emotion: p.emotion }));
    }

    await robot.runTurn("哈哈");
    expect(events.map((e) => e.ev)).toEqual(["sakura", "lip_sync", "done"]);
    const hud = robot.getHud();
    expect(hud.phase).toBe("done");
    expect(hud.emotion).toBe("happy");
    expect(hud.summary).toBeTruthy();
    expect(hud.steps.length).toBeGreaterThan(0);

    robot.abort("stop");
    expect(robot.getHud().phase).toBe("aborted");
    robot.reset();
    expect(robot.getHud()).toEqual({
      phase: "idle",
      emotion: "neutral",
      summary: "",
      steps: [],
    });
  });

  it("plans first steps for name memory", () => {
    const plan = planRobotSteps("我叫小明", {});
    expect(plan.steps[0]).toBe("store_name:小明");
    expect(plan.emotion).toBe("happy");
  });
});
