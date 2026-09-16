import { describe, expect, it } from "vitest";
import {
  isSecretarySystemPrompt,
  secretaryLocalReply,
} from "../engine/companion/secretary/secretaryLocalReply.mjs";

describe("secretaryLocalReply", () => {
  it("detects secretary system prompts", () => {
    expect(isSecretarySystemPrompt("You are Amoji secretary. [task:Title]")).toBe(
      true,
    );
    expect(isSecretarySystemPrompt("你係 Amoji 秘書")).toBe(true);
    expect(isSecretarySystemPrompt("You are a companion")).toBe(false);
  });

  it("returns task tags for reminders", () => {
    const reply = secretaryLocalReply("今晚提醒我打電話", { isEn: false });
    expect(reply).toMatch(/\[task:打電話/);
    expect(reply).toMatch(/\[mood:happy\]/);
  });

  it("returns memory tags", () => {
    const reply = secretaryLocalReply("記住我唔食香菜", { isEn: false });
    expect(reply).toMatch(/\[memory:唔食香菜\]/);
  });

  it("returns ui tags for navigation", () => {
    const reply = secretaryLocalReply("show my tasks", { isEn: true });
    expect(reply).toMatch(/\[ui:tab:tasks\]/);
  });

  it("returns mode tags for chill", () => {
    const reply = secretaryLocalReply("閒聊模式", { isEn: false });
    expect(reply).toMatch(/\[ui:mode:chill\]/);
  });
});
