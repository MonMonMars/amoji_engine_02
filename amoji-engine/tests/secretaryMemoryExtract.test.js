import { describe, expect, it } from "vitest";
import { extractMemoryFromMessage } from "../engine/companion/secretary/memoryExtract.js";

describe("secretary memoryExtract", () => {
  it("extracts Cantonese remember phrase", () => {
    const result = extractMemoryFromMessage("記住我唔食香菜", { isEn: false });
    expect(result.confidence).toBeGreaterThan(0.7);
    expect(result.memory?.text).toMatch(/香菜/);
  });

  it("extracts English preference", () => {
    const result = extractMemoryFromMessage("I prefer morning meetings", {
      isEn: true,
    });
    expect(result.confidence).toBeGreaterThan(0.7);
    expect(result.memory?.category).toBe("preference");
  });
});
