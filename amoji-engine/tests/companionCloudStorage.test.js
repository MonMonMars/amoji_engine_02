import { describe, expect, it } from "vitest";
import { mergeCloudSave } from "../engine/mobile/companionCloudStorage.js";

describe("companionCloudStorage", () => {
  it("merges remote save over local treats and chase", () => {
    const local = {
      treats: { coins: 10, hunger: 40, hearts: 50 },
      chase: { highScore: 100 },
    };
    const remote = {
      treats: { coins: 99 },
      chase: { highScore: 250, streakDays: 2 },
    };
    const merged = mergeCloudSave(local, remote);
    expect(merged.treats.coins).toBe(99);
    expect(merged.treats.hunger).toBe(40);
    expect(merged.chase.highScore).toBe(250);
    expect(merged.chase.streakDays).toBe(2);
  });
});
