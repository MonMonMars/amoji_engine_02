/**
 * User-selected experience mode (girlfriend / boyfriend / secretary / pet)
 * in the unified app — persists across character changes when override is on.
 */
import {
  COMPANION_ROLES,
  normalizeCompanionRole,
  roleEmoji,
  roleLabel,
  roleTagline,
  saveCompanionRole,
} from "../mobile/companionRolePresets.js";
import { buildCompanionHref } from "./companionVoiceCatalog.js";

export const COMPANION_SESSION_MODE_SCHEMA = "amoji.companionSessionMode.v1";
export const SESSION_MODE_OVERRIDE_KEY = "amoji.companionSessionModeOverride.v1";

/**
 * @param {Pick<Storage, "getItem"> | null | undefined} [storage]
 */
export function loadSessionModeOverride(storage = globalThis.localStorage) {
  try {
    return storage?.getItem?.(SESSION_MODE_OVERRIDE_KEY) === "1";
  } catch {
    return false;
  }
}

/**
 * @param {boolean} on
 * @param {Pick<Storage, "setItem"> | null | undefined} [storage]
 */
export function setSessionModeOverride(on, storage = globalThis.localStorage) {
  try {
    storage?.setItem?.(SESSION_MODE_OVERRIDE_KEY, on ? "1" : "0");
  } catch {
    /* ignore */
  }
}

/**
 * Save mode from the settings menu without remapping the active character id.
 * @param {import("../mobile/companionRolePresets.js").CompanionRole | string} role
 * @param {Pick<Storage, "setItem"> | null | undefined} [storage]
 */
export function persistUserSessionMode(role, storage = globalThis.localStorage) {
  const next = normalizeCompanionRole(role);
  saveCompanionRole(next, storage, { touchDefaultCharacter: false });
  setSessionModeOverride(true, storage);
  return next;
}

/**
 * @param {boolean} [isEnglish]
 */
export function modeMenuCopy(isEnglish = false) {
  const en = Boolean(isEnglish);
  return {
    section: en ? "Experience mode" : "體驗模式",
    hint: en
      ? "One app for girlfriend, boyfriend, secretary, and pet — switch anytime."
      : "女朋友、男朋友、秘書、寵物 — 同一個 App，隨時轉換。",
    aria: en ? "Companion experience mode" : "同伴體驗模式",
  };
}

/**
 * @param {import("../mobile/companionRolePresets.js").CompanionRole} activeRole
 * @param {boolean} [isEnglish]
 */
export function formatActiveModeSummary(activeRole, isEnglish = false) {
  const role = normalizeCompanionRole(activeRole);
  const en = Boolean(isEnglish);
  return en
    ? `${roleEmoji(role)} ${roleLabel(role, true)} — ${roleTagline(role, true)}`
    : `${roleEmoji(role)} ${roleLabel(role, false)} — ${roleTagline(role, false)}`;
}

/**
 * @param {HTMLElement | null | undefined} container
 * @param {{ activeRole?: string, isEnglish?: boolean, onSelect?: (role: string) => void }} opts
 */
export function renderSessionModeMenu(container, opts = {}) {
  if (!container) return;
  const active = normalizeCompanionRole(opts.activeRole || "girlfriend");
  const en = Boolean(opts.isEnglish);
  container.replaceChildren();
  for (const role of COMPANION_ROLES) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className =
      "settings-mode-chip" + (role === active ? " is-active" : "");
    btn.setAttribute("role", "radio");
    btn.setAttribute("aria-checked", role === active ? "true" : "false");
    btn.dataset.appRole = role;
    btn.title = roleTagline(role, en);
    btn.innerHTML = `
      <span class="settings-mode-chip__emoji" aria-hidden="true">${roleEmoji(role)}</span>
      <span class="settings-mode-chip__label">${roleLabel(role, en)}</span>
    `.trim();
    btn.addEventListener("click", () => {
      if (role === active) return;
      opts.onSelect?.(role);
    });
    container.appendChild(btn);
  }
}

/**
 * @param {{
 *   basePath?: string,
 *   lang?: string,
 *   role?: string | null,
 *   character?: string | null,
 *   extra?: Record<string, string>,
 * }} opts
 */
export function buildSessionHref(opts = {}) {
  const extra = { pick: "1", automic: "0", ...(opts.extra || {}) };
  if (opts.role) extra.role = normalizeCompanionRole(opts.role);
  if (opts.character) extra.character = String(opts.character).toLowerCase();
  return buildCompanionHref({
    basePath: opts.basePath || "/play",
    lang: opts.lang,
    extra,
  });
}

export { COMPANION_ROLES, normalizeCompanionRole, roleLabel };
