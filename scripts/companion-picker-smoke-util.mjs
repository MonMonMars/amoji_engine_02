/**
 * Playwright helpers for v4 picker — select preview, then confirm with Begin chat.
 */

const START_ROOT = "#start-character-picker";
const SESSION_ROOT = "#companion-character-picker";

/**
 * @param {import("playwright").Page} page
 * @param {{ characterId?: string, cardTimeout?: number, dismissTimeout?: number }} [opts]
 */
export async function beginStartPickerSession(page, opts = {}) {
  const cardTimeout = opts.cardTimeout ?? 90000;
  const dismissTimeout = opts.dismissTimeout ?? 60000;
  const cardSel = opts.characterId
    ? `${START_ROOT} [data-character-id="${opts.characterId}"]:not([disabled])`
    : `${START_ROOT} .companion-card:not([disabled])`;

  await page.waitForSelector(cardSel, { timeout: cardTimeout });
  await page.click(cardSel);

  const beginSel = `${START_ROOT} .picker-begin-btn:not([disabled])`;
  await page.waitForSelector(beginSel, { timeout: 15000 });
  await page.click(beginSel);

  await page.waitForFunction(
    () => {
      const picker = document.getElementById("start-character-picker");
      return !picker || picker.classList.contains("hide");
    },
    undefined,
    { timeout: dismissTimeout },
  );
}

/**
 * @param {import("playwright").Page} page
 * @param {string} characterId
 * @param {{ openSelector?: string, timeout?: number }} [opts]
 */
export async function switchCompanionInSession(page, characterId, opts = {}) {
  const openSelector = opts.openSelector ?? "#brand-btn";
  const timeout = opts.timeout ?? 120000;
  const alreadyOpen = await page.$(`${SESSION_ROOT}.is-open`);
  if (!alreadyOpen) {
    await page.click(openSelector);
    await page.waitForSelector(`${SESSION_ROOT}.is-open`, { timeout: 8000 });
  }
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
