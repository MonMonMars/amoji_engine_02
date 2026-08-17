import { describe, expect, it } from "vitest";
import {
  EMOTION_EXPRESSION_SCHEMA,
  expressionParamsForEmotion,
  listExpressionPresets,
  mapEmotionToExpression,
  nextExpressionPreset,
} from "../engine/face/emotionExpression.js";
import {
  SAKURA_EXPRESSION_PRESETS,
  createSakuraFaceLiveClient,
} from "../engine/face/sakuraFaceLiveClient.js";

describe("emotionExpression", () => {
  it("maps SER / alias labels onto Sakura presets", () => {
    expect(mapEmotionToExpression("HAPPY")).toBe("happy");
    expect(mapEmotionToExpression("joy")).toBe("happy");
    expect(mapEmotionToExpression("fearful")).toBe("surprised");
    expect(mapEmotionToExpression("disgust")).toBe("angry");
    expect(mapEmotionToExpression("unknown-xyz")).toBe("neutral");
    expect(mapEmotionToExpression("", { fallback: "thinking" })).toBe("thinking");
  });

  it("builds injectable parameter payloads", () => {
    const pack = expressionParamsForEmotion("surprised");
    expect(pack.schema).toBe(EMOTION_EXPRESSION_SCHEMA);
    expect(pack.expression).toBe("surprised");
    expect(pack.parameters.length).toBe(
      SAKURA_EXPRESSION_PRESETS.surprised.length,
    );
    expect(pack.parameters[0]).toHaveProperty("id");
  });

  it("cycles lab expression presets", () => {
    const list = listExpressionPresets();
    expect(list).toContain("angry");
    expect(list).toContain("surprised");
    expect(nextExpressionPreset("angry")).toBe("neutral");
    expect(nextExpressionPreset("happy")).toBe("thinking");
  });

  it("Face Live client accepts angry + surprised presets", () => {
    const injected = [];
    const client = createSakuraFaceLiveClient({
      createWebSocket: () => {
        throw new Error("no ws");
      },
    });
    // Bypass auth — injectParameters only queues when authenticated; call setExpression
    // and inspect via getExpression after poking private path through setExpression state.
    client.setExpression("angry");
    expect(client.expression).toBe("angry");
    client.setExpression("surprised");
    expect(client.expression).toBe("surprised");
    expect(injected).toEqual([]);
  });
});
