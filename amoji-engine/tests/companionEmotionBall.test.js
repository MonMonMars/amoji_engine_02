import { describe, expect, it, vi } from "vitest";
import {
  companionEmotionBallInnerHtml,
  computeMiniEmotionBallFrame,
  createCompanionEmotionBall,
  createMiniEmotionBall,
  miniEmotionBallLabel,
  syncMiniEmotionBall,
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
    attrs: { role: "", "aria-label": "" },
    querySelector(sel) {
      if (sel === ".emotion-ball__canvas") return null;
      return null;
    },
    setAttribute(key, value) {
      this.attrs[key] = String(value);
    },
    getAttribute(key) {
      return this.attrs[key] || null;
    },
    removeAttribute(key) {
      delete this.attrs[key];
    },
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

  it("drives the chip dot like a ChatGPT mini emotion ball", () => {
    const el = mockBallEl();
    const theme = syncMiniEmotionBall(el, {
      emotion: "happy",
      level: 0.8,
      state: "speaking",
    });
    expect(el.dataset.state).toBe("speaking");
    expect(el.dataset.emotion).toBe("happy");
    expect(el.style.getPropertyValue("--mini-ball-scale")).not.toBe("");
    expect(el.style.getPropertyValue("--mini-ball-bg")).toContain("hsl(");
    expect(el.style.getPropertyValue("--mini-ball-bright")).not.toBe("");
    expect(theme.scale).toBeGreaterThan(1.08);
    expect(theme.hue).toBeGreaterThan(0);
  });

  it("grows the chip ball with speaking volume", () => {
    const el = mockBallEl();
    const quiet = syncMiniEmotionBall(el, {
      emotion: "happy",
      level: 0.1,
      state: "speaking",
    });
    const loud = syncMiniEmotionBall(el, {
      emotion: "happy",
      level: 0.9,
      state: "speaking",
    });
    expect(loud.scale).toBeGreaterThan(quiet.scale);
    expect(loud.volume).toBeGreaterThan(quiet.volume);
  });

  it("maps emotion to color and state to motion", () => {
    const happy = computeMiniEmotionBallFrame({
      emotion: "happy",
      state: "speaking",
      level: 0.6,
    });
    const sad = computeMiniEmotionBallFrame({
      emotion: "sad",
      state: "speaking",
      level: 0.6,
    });
    const angry = computeMiniEmotionBallFrame({
      emotion: "angry",
      state: "speaking",
      level: 0.6,
    });
    expect(happy.hue).not.toBe(sad.hue);
    expect(sad.hue).not.toBe(angry.hue);
    const idleA = computeMiniEmotionBallFrame({ state: "idle", time: 0 });
    const idleB = computeMiniEmotionBallFrame({ state: "idle", time: 1.08 });
    expect(Math.abs(idleB.volume - idleA.volume)).toBeGreaterThan(0.1);
    const thinking = computeMiniEmotionBallFrame({ state: "thinking", time: 0.4 });
    expect(thinking.thinking).toBe(true);
    expect(thinking.volume).toBeGreaterThan(0.15);
    const listenQuiet = computeMiniEmotionBallFrame({
      state: "listening",
      level: 0,
      time: 0.2,
    });
    expect(listenQuiet.live).toBe(true);
    expect(listenQuiet.volume).toBeGreaterThan(0.08);
    const blocked = computeMiniEmotionBallFrame({
      state: "mic-blocked",
      emotion: "happy",
      level: 0.9,
    });
    expect(blocked.disabled).toBe(true);
    expect(blocked.live).toBe(false);
    expect(blocked.sat).toBeLessThan(30);
    const typing = computeMiniEmotionBallFrame({ state: "typing", time: 0.3 });
    expect(typing.typing).toBe(true);
    expect(typing.live).toBe(false);
    const joy = computeMiniEmotionBallFrame({
      emotion: "joy",
      state: "speaking",
      level: 0.5,
    });
    expect(joy.emotion).toBe("happy");
    expect(joy.hue).toBe(happy.hue);
    const idleSquashA = computeMiniEmotionBallFrame({ state: "idle", time: 0 });
    const idleSquashB = computeMiniEmotionBallFrame({ state: "idle", time: 1.08 });
    expect(Math.abs(idleSquashB.squash - idleSquashA.squash)).toBeGreaterThan(0.08);
    const still = computeMiniEmotionBallFrame({
      state: "idle",
      time: 1.08,
      reducedMotion: true,
    });
    expect(still.squash).toBe(1);
    expect(still.spin).toBe(0);
    const loading = computeMiniEmotionBallFrame({ state: "loading", time: 0.4 });
    expect(loading.loading).toBe(true);
    expect(loading.thinking).toBe(true);
    expect(loading.volume).toBeLessThan(thinking.volume + 0.05);
  });

  it("labels aliased emotions and exposes an accessible name", () => {
    const el = mockBallEl();
    const theme = syncMiniEmotionBall(el, {
      emotion: "sorrow",
      state: "speaking",
      level: 0.4,
      isEnglish: true,
    });
    expect(theme.emotion).toBe("sad");
    expect(el.title).toMatch(/Sad/);
    expect(el.getAttribute("aria-label")).toMatch(/Speaking · Sad/);
    expect(el.getAttribute("role")).toBe("img");
    expect(miniEmotionBallLabel({ emotion: "thinking", state: "thinking" }, true)).toBe(
      "Thinking",
    );
  });

  it("runs a live mini emotion ball control loop", () => {
    const frames = [];
    vi.stubGlobal("requestAnimationFrame", (cb) => {
      frames.push(cb);
      return frames.length;
    });
    vi.stubGlobal("cancelAnimationFrame", () => {});
    const el = mockBallEl();
    const ball = createMiniEmotionBall(el);
    ball.sync({ emotion: "surprised", state: "speaking", level: 0.85 });
    expect(el.classList.contains("mini-emotion-ball")).toBe(true);
    expect(ball.getState()).toBe("speaking");
    expect(frames.length).toBeGreaterThan(0);
    frames[0](32);
    expect(el.dataset.emotion).toBe("surprised");
    expect(el.style.getPropertyValue("--mini-ball-scale")).not.toBe("");
    expect(ball.getFrame().live).toBe(true);
    ball.destroy();
    const yueEl = mockBallEl();
    const yueBall = createMiniEmotionBall(yueEl, { isEnglish: false });
    yueBall.sync({ emotion: "happy", state: "speaking", level: 0.6 });
    frames[frames.length - 1](48);
    expect(yueEl.title).toMatch(/講緊/);
    yueBall.destroy();
    vi.unstubAllGlobals();
  });
});
