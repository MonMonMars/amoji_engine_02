import { describe, expect, it } from "vitest";
import {
  EMOTION_EXPRESSION_SCHEMA,
  expressionParamsForEmotion,
  inferExpressionFromText,
  listExpressionPresets,
  mapEmotionToExpression,
  nextExpressionPreset,
  resolveExpressionFromTurn,
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

  it("infers expression from Cantonese / English text", () => {
    expect(inferExpressionFromText("哈哈好開心呀！")).toBe("happy");
    expect(inferExpressionFromText("哇！真係？")).toBe("surprised");
    expect(inferExpressionFromText("我諗緊點解")).toBe("thinking");
    expect(inferExpressionFromText("唉，好傷心")).toBe("sad");
    expect(inferExpressionFromText("今日天氣幾好")).toBe("neutral");
    expect(inferExpressionFromText("你好呀！")).toBe("happy");
    expect(inferExpressionFromText("哈哈！！")).toBe("happy");
    expect(inferExpressionFromText("我好嬲呀")).toBe("angry");
    expect(inferExpressionFromText("係呀，得喇")).toBe("neutral");
    expect(inferExpressionFromText("嗯，好嘅。")).toBe("neutral");
  });

  it("resolveExpressionFromTurn prefers emotion then text", () => {
    expect(
      resolveExpressionFromTurn({ emotion: "sad", text: "哈哈開心" }).expression,
    ).toBe("sad");
    expect(resolveExpressionFromTurn({ text: "哈哈開心" }).source).toBe("text");
    expect(resolveExpressionFromTurn({ text: "哈哈開心" }).expression).toBe(
      "happy",
    );
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
    client.setExpression("angry");
    expect(client.expression).toBe("angry");
    client.setExpression("surprised");
    expect(client.expression).toBe("surprised");
    expect(injected).toEqual([]);
  });
});
