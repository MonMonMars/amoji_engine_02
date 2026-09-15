import { describe, expect, it } from "vitest";
import {
  extractTaskFromMessage,
  parseDueHint,
} from "../engine/companion/secretary/taskExtract.js";

describe("secretary taskExtract", () => {
  it("extracts English reminder tasks", () => {
    const result = extractTaskFromMessage("Remind me to email Alex tomorrow", {
      isEn: true,
      now: new Date("2026-09-15T10:00:00Z").getTime(),
    });
    expect(result.confidence).toBeGreaterThan(0.7);
    expect(result.task?.title.toLowerCase()).toContain("email alex");
    expect(result.task?.dueAt).toBeTruthy();
  });

  it("extracts Cantonese reminder tasks", () => {
    const result = extractTaskFromMessage("提醒我今晚打電話俾媽媽", {
      isEn: false,
    });
    expect(result.confidence).toBeGreaterThan(0.7);
    expect(result.task?.title).toContain("打電話");
  });

  it("parses tonight due hints", () => {
    const now = new Date("2026-09-15T14:00:00Z").getTime();
    const due = parseDueHint("tonight", true, now);
    expect(due).toBeTruthy();
    expect(new Date(due).getHours()).toBeGreaterThanOrEqual(0);
  });
});
