import { describe, expect, it, vi, afterEach } from "vitest";
import {
  bindCompanionUiAudio,
  COMPANION_UI_EFFECTS_SCHEMA,
  closeUiOverlay,
  initCompanionUiEffects,
  openUiOverlay,
  spawnUiRipple,
  switchUiTabPanel,
  UI_FX_BUTTON_SELECTOR,
  UI_OVERLAY_CLOSE_MS,
} from "../engine/companion/companionUiEffects.js";

function createClassList(store) {
  return {
    add: (...names) => {
      names.forEach((n) => store.add(n));
    },
    remove: (...names) => {
      names.forEach((n) => store.delete(n));
    },
    contains: (name) => store.has(name),
    toggle: (name, on) => {
      if (on === undefined) {
        if (store.has(name)) store.delete(name);
        else store.add(name);
      } else if (on) store.add(name);
      else store.delete(name);
    },
  };
}

function mockEl(tag = "div") {
  const classes = new Set();
  const attrs = new Map();
  const children = [];
  const el = {
    tagName: tag.toUpperCase(),
    classList: createClassList(classes),
    className: "",
    children,
    disabled: false,
    style: {},
    appendChild(child) {
      children.push(child);
      return child;
    },
    querySelector(sel) {
      if (sel === ".ui-fx-ripple") {
        return children.find((c) => c.className === "ui-fx-ripple") ?? null;
      }
      return null;
    },
    setAttribute(name, value) {
      attrs.set(name, value);
    },
    getAttribute(name) {
      return attrs.get(name);
    },
    hasAttribute(name) {
      return attrs.has(name);
    },
    removeAttribute(name) {
      attrs.delete(name);
    },
    getBoundingClientRect() {
      return { width: 40, height: 40, left: 0, top: 0 };
    },
    closest() {
      return null;
    },
    addEventListener: vi.fn(),
  };
  Object.defineProperty(el, "className", {
    get: () => [...classes].join(" "),
    set: (value) => {
      classes.clear();
      String(value)
        .split(/\s+/)
        .filter(Boolean)
        .forEach((n) => classes.add(n));
    },
  });
  return el;
}

function mockDoc(bodyEl) {
  const body = bodyEl ?? mockEl("body");
  const rafQueue = [];
  const view = {
    matchMedia: () => ({ matches: false }),
    requestAnimationFrame: (cb) => {
      rafQueue.push(cb);
      return rafQueue.length;
    },
    setTimeout: (...args) => setTimeout(...args),
    flushRaf() {
      while (rafQueue.length) rafQueue.shift()();
    },
  };
  return {
    body,
    createElement: (tag) => mockEl(tag),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    defaultView: view,
    flushRaf: () => view.flushRaf(),
  };
}

describe("companionUiEffects", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("exports schema and button selector", () => {
    expect(COMPANION_UI_EFFECTS_SCHEMA).toBe("amoji.companionUiEffects.v2");
    expect(UI_FX_BUTTON_SELECTOR).toContain("button:not([disabled])");
  });

  it("spawns a ripple element inside the target", () => {
    const doc = mockDoc();
    const btn = mockEl("button");
    spawnUiRipple(btn, 20, 20, doc);
    expect(btn.querySelector(".ui-fx-ripple")).toBeTruthy();
    expect(btn.classList.contains("ui-fx-has-ripple")).toBe(true);
  });

  it("skips init when reduced motion is preferred", () => {
    const doc = mockDoc();
    initCompanionUiEffects(doc, { reducedMotion: true });
    expect(doc.body.classList.contains("ui-fx-enabled")).toBe(false);
    expect(doc.body.classList.contains("companion-jp-aaa-ui")).toBe(false);
  });

  it("enables JP AAA shell class with UI FX", () => {
    vi.stubGlobal(
      "MutationObserver",
      class {
        observe() {}
        disconnect() {}
      },
    );
    const doc = mockDoc();
    doc.body.querySelectorAll = () => [];
    const fx = initCompanionUiEffects(doc, { reducedMotion: false });
    expect(doc.body.classList.contains("ui-fx-enabled")).toBe(true);
    expect(doc.body.classList.contains("companion-jp-aaa-ui")).toBe(true);
    fx.destroy();
    expect(doc.body.classList.contains("companion-jp-aaa-ui")).toBe(false);
  });

  it("plays sheet SFX when audio is bound", () => {
    const doc = mockDoc();
    const panel = mockEl("div");
    const played = [];
    bindCompanionUiAudio({
      play: (id) => {
        played.push(id);
        return true;
      },
      haptic: () => true,
    });
    openUiOverlay(doc, { panel, bodyClass: "settings-open" });
    expect(played).toContain("sheet-open");
    closeUiOverlay(doc, { panel, bodyClass: "settings-open", hideDelay: 0 });
    expect(played).toContain("sheet-close");
    bindCompanionUiAudio(null);
  });

  it("opens and closes overlays with transition classes", () => {
    vi.useFakeTimers();
    const doc = mockDoc();
    const panel = mockEl("div");
    const backdrop = mockEl("div");

    openUiOverlay(doc, {
      panel,
      backdrop,
      bodyClass: "settings-open",
    });
    expect(panel.classList.contains("ui-overlay-entering")).toBe(true);
    expect(doc.body.classList.contains("settings-open")).toBe(true);
    doc.flushRaf();
    doc.flushRaf();
    expect(panel.classList.contains("open")).toBe(true);
    expect(panel.classList.contains("ui-overlay-entering")).toBe(false);
    closeUiOverlay(doc, {
      panel,
      backdrop,
      bodyClass: "settings-open",
      hideDelay: UI_OVERLAY_CLOSE_MS,
    });
    expect(panel.classList.contains("ui-overlay-closing")).toBe(true);
    expect(panel.classList.contains("open")).toBe(false);
    expect(doc.body.classList.contains("settings-open")).toBe(false);

    vi.advanceTimersByTime(UI_OVERLAY_CLOSE_MS + 10);
    expect(panel.hasAttribute("hidden")).toBe(true);
    expect(backdrop.hasAttribute("hidden")).toBe(true);
  });

  it("does not re-open after close before enter animation finishes", () => {
    vi.useFakeTimers();
    const doc = mockDoc();
    const panel = mockEl("div");
    const backdrop = mockEl("div");

    openUiOverlay(doc, {
      panel,
      backdrop,
      bodyClass: "settings-open",
    });
    closeUiOverlay(doc, {
      panel,
      backdrop,
      bodyClass: "settings-open",
      hideDelay: UI_OVERLAY_CLOSE_MS,
    });
    doc.flushRaf();
    doc.flushRaf();
    expect(panel.classList.contains("open")).toBe(false);
    expect(backdrop.classList.contains("is-open")).toBe(false);
    vi.advanceTimersByTime(UI_OVERLAY_CLOSE_MS + 10);
    expect(panel.classList.contains("open")).toBe(false);
    expect(panel.hasAttribute("hidden")).toBe(true);
  });

  it("animates tab panel swaps", () => {
    vi.useFakeTimers();
    const doc = mockDoc();
    const panelA = mockEl("section");
    const panelB = mockEl("section");
    panelB.classList.add("hidden");
    const tabA = { dataset: { tab: "a" }, classList: createClassList(new Set(["active"])) };
    const tabB = { dataset: { tab: "b" }, classList: createClassList(new Set()) };

    switchUiTabPanel(doc, {
      panels: { a: panelA, b: panelB },
      tabs: [tabA, tabB],
      nextId: "b",
      durationMs: 280,
    });
    expect(panelA.classList.contains("ui-tab-leaving")).toBe(true);

    vi.advanceTimersByTime(240);
    doc.flushRaf();
    doc.flushRaf();
    expect(panelA.classList.contains("hidden")).toBe(true);
    expect(panelB.classList.contains("hidden")).toBe(false);
    expect(tabB.classList.contains("active")).toBe(true);
  });
});
