import { describe, expect, it } from "vitest";
import { localCompanionReply } from "../engine/companion/companionLocalReply.mjs";

describe("companionLocalReply", () => {
  it("returns short hello with mood tag", () => {
    expect(localCompanionReply("hello")).toContain("[mood:happy]");
    expect(localCompanionReply("hello").length).toBeLessThan(24);
  });

  it("returns kung fu action tag", () => {
    const reply = localCompanionReply("show me kung fu");
    expect(reply).toContain("[action:kungfu]");
    expect(reply).toContain("[mood:happy]");
  });

  it("uses web context when provided", () => {
    const reply = localCompanionReply("what is AI?", [], "Web search snapshot:\nArtificial intelligence is …");
    expect(reply).toContain("Artificial intelligence");
    expect(reply).toContain("[mood:thinking]");
  });
});
