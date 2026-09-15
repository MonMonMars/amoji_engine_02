import { describe, expect, it, vi } from "vitest";
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
      if (sel === ".emotion-ball__canvas") return null;
      return null;
    },
    setAttribute() {},
    removeAttribute() {},
    getBoundingClientRect() {
      return { width: 88, height: 88 };
    },
  };
}

describe("companionEmotionBall", () => {
  it("renders canvas orb markup with spectrum HUD", () => {
    const html = companionEmotionBallInnerHtml();
    expect(html).toContain("emotion-ball__canvas");
    expect(html).toContain("emotion-ball__spectrum");
    expect(html).toContain("emotion-ball__emotion-chip");
    expect(html).toContain("emotion-ball__volume-fill");
  });

  it("syncs state from session + mic context", () => {
    const el = mockBallEl();
    const ball = createCompanionEmotionBall(el, { isEnglish: true });
    ball.sync({ sessionState: "thinking", emotion: "thinking" });
    expect(el.dataset.ballState).toBe("thinking");
    ball.sync({ sessionState: "speaking", speaking: true, emotion: "happy", level: 0.7 });
    expect(el.dataset.ballState).toBe("speaking");
    ball.setLevel(0.7);
    expect(el.style.getPropertyValue("--ball-level")).not.toBe("");
    ball.sync({ micOn: true, sessionState: "listening", emotion: "happy", level: 0.4 });
    expect(el.dataset.ballState).toBe("listening");
  });

  it("applies emotion theme via CSS variables", () => {
    const el = mockBallEl();
    const ball = createCompanionEmotionBall(el);
    ball.setEmotion("surprised", "excited");
    expect(el.style.getPropertyValue("--ball-hue")).not.toBe("");
    expect(el.dataset.emotion).toBe("surprised");
  });

  it("shows and hides the stack wrapper", () => {
    vi.stubGlobal("requestAnimationFrame", () => 0);
    vi.stubGlobal("cancelAnimationFrame", () => {});
    const el = mockBallEl();
    const ball = createCompanionEmotionBall(el);
    ball.show();
    expect(el.hidden).toBe(false);
    expect(el.parentElement.classList.contains("is-hidden")).toBe(false);
    ball.hide();
    expect(el.hidden).toBe(true);
    expect(el.parentElement.classList.contains("is-hidden")).toBe(true);
    vi.unstubAllGlobals();
  });
});
