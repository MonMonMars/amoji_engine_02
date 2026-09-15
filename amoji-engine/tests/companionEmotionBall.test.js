import { describe, expect, it } from "vitest";
import {
  companionEmotionBallInnerHtml,
  createCompanionEmotionBall,
} from "../engine/companion/companionEmotionBall.js";

/** @returns {HTMLElement} */
function mockBallEl() {
  const stack = {
    className: "emotion-ball-stack is-hidden",
    classList: {
      /** @type {Set<string>} */
      _c: new Set(["emotion-ball-stack", "is-hidden"]),
      contains(name) {
        return this._c.has(name);
      },
      add(name) {
        this._c.add(name);
      },
      remove(name) {
        this._c.delete(name);
      },
    },
    removeAttribute() {},
    setAttribute() {},
    querySelector() {
      return caption;
    },
  };
  const caption = { textContent: "" };
  const style = {
    /** @type {Map<string, string>} */
    _props: new Map(),
    setProperty(key, value) {
      this._props.set(key, value);
    },
    removeProperty(key) {
      this._props.delete(key);
    },
    getPropertyValue(key) {
      return this._props.get(key) || "";
    },
  };
  return {
    className: "",
    classList: {
      /** @type {Set<string>} */
      _c: new Set(),
      add(name) {
        this._c.add(name);
      },
      toggle(name, on) {
        if (on) this._c.add(name);
        else this._c.delete(name);
      },
      contains(name) {
        return this._c.has(name);
      },
    },
    dataset: {},
    style,
    innerHTML: "",
    hidden: true,
    parentElement: stack,
    querySelector(sel) {
      return sel === ".emotion-ball__core" ? null : null;
    },
    setAttribute() {},
    removeAttribute() {},
  };
}

describe("companionEmotionBall", () => {
  it("renders layered orb markup", () => {
    const html = companionEmotionBallInnerHtml();
    expect(html).toContain("emotion-ball__core");
    expect(html).toContain("emotion-ball__halo");
    expect(html).toContain("emotion-ball__wave");
  });

  it("syncs state from session + mic context", () => {
    const el = mockBallEl();
    const ball = createCompanionEmotionBall(el, { isEnglish: true });
    ball.sync({ sessionState: "thinking", emotion: "thinking" });
    expect(el.dataset.ballState).toBe("thinking");
    ball.sync({ sessionState: "speaking", speaking: true, emotion: "happy" });
    expect(el.dataset.ballState).toBe("speaking");
    ball.sync({ micOn: true, sessionState: "listening", emotion: "happy" });
    expect(el.dataset.ballState).toBe("listening");
  });

  it("applies emotion theme via CSS variables", () => {
    const el = mockBallEl();
    const ball = createCompanionEmotionBall(el);
    ball.setEmotion("surprised", "excited");
    expect(el.style.getPropertyValue("--ball-hue")).not.toBe("");
    expect(el.style.getPropertyValue("--ball-accent")).toContain("hsl(");
  });

  it("shows and hides the stack wrapper", () => {
    const el = mockBallEl();
    const ball = createCompanionEmotionBall(el);
    ball.show();
    expect(el.hidden).toBe(false);
    expect(el.parentElement.classList.contains("is-hidden")).toBe(false);
    ball.hide();
    expect(el.hidden).toBe(true);
    expect(el.parentElement.classList.contains("is-hidden")).toBe(true);
  });
});
