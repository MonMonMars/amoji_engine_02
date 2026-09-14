import { describe, expect, it } from "vitest";
import { localCompanionReply } from "../engine/companion/companionLocalReply.mjs";

describe("companionLocalReply", () => {
  it("returns hello with wave action and mood tag", () => {
    const reply = localCompanionReply("hello");
    expect(reply).toContain("[mood:happy]");
    expect(reply).toContain("[action:wave]");
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
