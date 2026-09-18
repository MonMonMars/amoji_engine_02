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
    : `${START_ROOT} .picker-featured-row [data-character-id="nova"]:not([disabled])`;

  await page.waitForSelector(cardSel, { timeout: cardTimeout });
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
      return !picker || picker.classList.contains("hide");
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
  await page.waitForSelector(`${SESSION_ROOT}.is-open`, { timeout: 8000 });
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
