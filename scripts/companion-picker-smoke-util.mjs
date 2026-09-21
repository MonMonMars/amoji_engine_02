/**
 * Playwright helpers for v4 picker — select preview, then confirm with Begin chat.
 */

const START_ROOT = "#start-character-picker";
const SESSION_ROOT = "#companion-character-picker";

/**
 * @param {Element | null | undefined} el
 */
function isDomVisible(el) {
  if (!el || el.disabled) return false;
  const style = globalThis.getComputedStyle?.(el);
  if (!style || style.display === "none" || style.visibility === "hidden") {
    return false;
  }
  const rect = el.getBoundingClientRect();
  return rect.width > 1 && rect.height > 1;
}

/**
 * Pick a visible character card on the start picker (featured row or main grid).
 * @param {string} [characterId]
 * @returns {string | null} CSS selector
 */
export function resolveVisibleStartPickerCardSelector(characterId = "nova") {
  if (typeof document === "undefined") return null;
  const id = String(characterId || "nova").toLowerCase();
  const candidates = [
    `${START_ROOT} .picker-featured-row [data-character-id="${id}"]:not([disabled])`,
    `${START_ROOT} .companion-picker-grid [data-character-id="${id}"]:not([disabled])`,
    `${START_ROOT} [data-character-id="${id}"]:not([disabled])`,
    `${START_ROOT} .companion-picker-grid [data-character-id]:not([disabled])`,
    `${START_ROOT} [data-character-id]:not([disabled])`,
  ];
  for (const sel of candidates) {
    const el = document.querySelector(sel);
    if (isDomVisible(el)) return sel;
  }
  return null;
}

/**
 * @param {import("playwright").Page} page
 * @param {{ characterId?: string, cardTimeout?: number, dismissTimeout?: number }} [opts]
 */
export async function beginStartPickerSession(page, opts = {}) {
  const cardTimeout = opts.cardTimeout ?? 90000;
  const dismissTimeout = opts.dismissTimeout ?? 60000;
  const characterId = String(opts.characterId || "nova").toLowerCase();

  await page.waitForFunction(
    (id) => {
      const isVisible = (el) => {
        if (!el || el.disabled) return false;
        const style = globalThis.getComputedStyle(el);
        if (style.display === "none" || style.visibility === "hidden") {
          return false;
        }
        const rect = el.getBoundingClientRect();
        return rect.width > 1 && rect.height > 1;
      };
      const featured = document.querySelector(
        `#start-character-picker .picker-featured-row [data-character-id="${id}"]`,
      );
      if (featured) {
        const wrap = featured.closest(".picker-featured-wrap");
        const wrapHidden =
          wrap &&
          (wrap.hidden ||
            globalThis.getComputedStyle(wrap).display === "none");
        if (!wrapHidden && isVisible(featured)) return true;
      }
      const gridCard = document.querySelector(
        `#start-character-picker .companion-picker-grid [data-character-id="${id}"]`,
      );
      if (isVisible(gridCard)) return true;
      const fallback =
        document.querySelector(
          "#start-character-picker .companion-picker-grid [data-character-id]:not([disabled])",
        ) ||
        document.querySelector(
          "#start-character-picker [data-character-id]:not([disabled])",
        );
      return isVisible(fallback);
    },
    characterId,
    { timeout: cardTimeout },
  );

  const cardSel = await page.evaluate((id) => {
    const isVisible = (el) => {
      if (!el || el.disabled) return false;
      const style = globalThis.getComputedStyle(el);
      if (style.display === "none" || style.visibility === "hidden") return false;
      const rect = el.getBoundingClientRect();
      return rect.width > 1 && rect.height > 1;
    };
    const pick = (sel) => {
      const el = document.querySelector(sel);
      return isVisible(el) ? sel : null;
    };
    return (
      pick(`#start-character-picker .picker-featured-row [data-character-id="${id}"]:not([disabled])`) ||
      pick(`#start-character-picker .companion-picker-grid [data-character-id="${id}"]:not([disabled])`) ||
      pick(`#start-character-picker [data-character-id="${id}"]:not([disabled])`) ||
      pick(`#start-character-picker .companion-picker-grid [data-character-id]:not([disabled])`) ||
      pick(`#start-character-picker [data-character-id]:not([disabled])`)
    );
  }, characterId);

  if (!cardSel) {
    throw new Error(`No visible start-picker card for ${characterId}`);
  }

  await page.evaluate((sel) => {
    const card = document.querySelector(sel);
    card?.scrollIntoView?.({ block: "center", inline: "center" });
    card?.click();
  }, cardSel);

  const beginSel = `${START_ROOT} .picker-begin-btn:not([disabled])`;
  await page.waitForSelector(beginSel, { timeout: 15000 });
  await page.evaluate((sel) => {
    document.querySelector(sel)?.click();
  }, beginSel);

  await page.waitForFunction(
    () => {
      const picker = document.getElementById("start-character-picker");
      const pickerHidden =
        !picker ||
        picker.hidden ||
        picker.classList.contains("hide") ||
        picker.getAttribute("aria-hidden") === "true";
      const bodyClear =
        !document.body.classList.contains("companion-picker-open") &&
        !document.body.classList.contains("companion-start-picker-open");
      const comp = document.querySelector(".composer-wrap");
      const cs = comp ? getComputedStyle(comp) : null;
      const composerUsable =
        comp &&
        cs &&
        cs.visibility !== "hidden" &&
        Number(cs.opacity) > 0.05 &&
        cs.pointerEvents !== "none";
      return pickerHidden && bodyClear && composerUsable;
    },
    undefined,
    { timeout: dismissTimeout },
  );
}

/**
 * Open in-session companion picker (brand chip or minimal settings menu).
 * @param {import("playwright").Page} page
 */
export async function openInSessionCompanionPicker(page) {
  const alreadyOpen = await page.$(`${SESSION_ROOT}.is-open`);
  if (alreadyOpen) return;

  const brand = page.locator("#brand-btn");
  if (await brand.isVisible().catch(() => false)) {
    await brand.click();
  } else {
    await page.click("#btn-open-setup");
    await page.waitForSelector("#settings-btn-companions", { timeout: 8000 });
    await page.click("#settings-btn-companions");
  }
  await page.waitForSelector(`${SESSION_ROOT}.is-open`, { timeout: 15000 });
}

/**
 * @param {import("playwright").Page} page
 * @param {string} characterId
 * @param {{ timeout?: number }} [opts]
 */
export async function switchCompanionInSession(page, characterId, opts = {}) {
  const timeout = opts.timeout ?? 120000;
  await openInSessionCompanionPicker(page);
  const cardSel = `${SESSION_ROOT} [data-character-id="${characterId}"]`;
  await page.waitForSelector(cardSel, { timeout: 15000 });
  await page.click(cardSel);
  const confirmSel = `${SESSION_ROOT} .picker-switch-btn:not([disabled])`;
  await page.waitForSelector(confirmSel, { timeout: 8000 });
  await page.click(confirmSel);
  await page.waitForFunction(
    () => {
      const picker = document.getElementById("companion-character-picker");
      return !picker?.classList.contains("is-open");
    },
    undefined,
    { timeout },
  );
}
