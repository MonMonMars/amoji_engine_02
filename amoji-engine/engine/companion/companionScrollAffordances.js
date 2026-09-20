/**
 * Optional scroll prev/next buttons for horizontal (or vertical) overflow regions.
 */
export const COMPANION_SCROLL_AFFORDANCES_SCHEMA =
  "amoji.companionScrollAffordances.v1";

/** @type {WeakMap<HTMLElement, () => void>} */
const unwires = new WeakMap();

const CHEVRON_LEFT =
  '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" aria-hidden="true"><path d="M14.5 6 9 12l5.5 6" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const CHEVRON_RIGHT =
  '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" aria-hidden="true"><path d="M9.5 6 15 12l-5.5 6" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const CHEVRON_UP =
  '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" aria-hidden="true"><path d="M6 14.5 12 9l6 5.5" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const CHEVRON_DOWN =
  '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" aria-hidden="true"><path d="M6 9.5 12 15l6-5.5" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>';

/**
 * @param {HTMLElement | null | undefined} scroller
 * @param {{
 *   axis?: "x" | "y",
 *   stepRatio?: number,
 *   labels?: { prev?: string, next?: string },
 * }} [opts]
 * @returns {(() => void) | null}
 */
export function wireScrollAffordances(scroller, opts = {}) {
  if (!scroller) return null;
  if (scroller.dataset.scrollAffordance === "1") {
    return unwires.get(scroller) || null;
  }
  const axis = opts.axis === "y" ? "y" : "x";
  const stepRatio = Number(opts.stepRatio) > 0 ? Number(opts.stepRatio) : 0.72;
  const host = scroller.parentElement;
  if (!host) return null;

  scroller.dataset.scrollAffordance = "1";
  host.classList.add("scroll-affordance-host");
  if (axis === "y") host.classList.add("scroll-affordance-host--vertical");

  const prev = document.createElement("button");
  prev.type = "button";
  prev.className = "scroll-affordance-btn scroll-affordance-btn--prev";
  prev.setAttribute(
    "aria-label",
    opts.labels?.prev || (axis === "y" ? "Scroll up" : "Scroll left"),
  );
  prev.innerHTML = axis === "y" ? CHEVRON_UP : CHEVRON_LEFT;

  const next = document.createElement("button");
  next.type = "button";
  next.className = "scroll-affordance-btn scroll-affordance-btn--next";
  next.setAttribute(
    "aria-label",
    opts.labels?.next || (axis === "y" ? "Scroll down" : "Scroll right"),
  );
  next.innerHTML = axis === "y" ? CHEVRON_DOWN : CHEVRON_RIGHT;

  host.insertBefore(prev, scroller);
  host.insertBefore(next, scroller.nextSibling);

  const scrollByStep = (dir) => {
    const delta =
      axis === "y"
        ? scroller.clientHeight * stepRatio
        : scroller.clientWidth * stepRatio;
    scroller.scrollBy({
      left: axis === "x" ? dir * delta : 0,
      top: axis === "y" ? dir * delta : 0,
      behavior: "smooth",
    });
  };

  prev.addEventListener("click", () => scrollByStep(-1));
  next.addEventListener("click", () => scrollByStep(1));

  const sync = () => {
    if (
      (typeof scroller.isConnected === "boolean" && !scroller.isConnected) ||
      (typeof host.isConnected === "boolean" && !host.isConnected)
    ) {
      return;
    }
    const overflow =
      axis === "y"
        ? scroller.scrollHeight > scroller.clientHeight + 4
        : scroller.scrollWidth > scroller.clientWidth + 4;
    host.classList.toggle("is-scrollable", overflow);
    if (!overflow) {
      prev.disabled = true;
      next.disabled = true;
      return;
    }
    if (axis === "y") {
      prev.disabled = scroller.scrollTop <= 2;
      next.disabled =
        scroller.scrollTop + scroller.clientHeight >= scroller.scrollHeight - 2;
    } else {
      prev.disabled = scroller.scrollLeft <= 2;
      next.disabled =
        scroller.scrollLeft + scroller.clientWidth >= scroller.scrollWidth - 2;
    }
  };

  scroller.addEventListener("scroll", sync, { passive: true });
  globalThis.addEventListener?.("resize", sync);
  const ro =
    typeof ResizeObserver !== "undefined"
      ? new ResizeObserver(() => sync())
      : null;
  ro?.observe(scroller);

  sync();
  requestAnimationFrame(sync);

  const unwire = () => {
    scroller.removeEventListener("scroll", sync);
    globalThis.removeEventListener?.("resize", sync);
    ro?.disconnect();
    prev.remove();
    next.remove();
    host.classList.remove("scroll-affordance-host", "scroll-affordance-host--vertical");
    delete scroller.dataset.scrollAffordance;
    unwires.delete(scroller);
  };
  unwires.set(scroller, unwire);
  return unwire;
}

/**
 * @param {ParentNode | null | undefined} root
 * @param {string} selector
 * @param {Parameters<typeof wireScrollAffordances>[1]} [opts]
 */
export function wireScrollAffordancesAll(root, selector, opts = {}) {
  if (!root) return () => {};
  const unwireFns = [];
  root.querySelectorAll(selector).forEach((el) => {
    if (el instanceof HTMLElement) {
      const fn = wireScrollAffordances(el, opts);
      if (fn) unwireFns.push(fn);
    }
  });
  return () => {
    for (const fn of unwireFns) fn();
  };
}
