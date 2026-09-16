/**
 * Parse/strip [ui:…] tags — no character-catalog import (avoids circular deps).
 */
export const COMPANION_UI_INTENT_TAGS_SCHEMA = "amoji.companionUiIntentTags.v1";

export const UI_TABS = Object.freeze(["today", "chat", "tasks", "me"]);
export const UI_MODES = Object.freeze(["work", "life", "chill"]);

const UI_TAG_RE = /\[ui:([^\]]+)\]/gi;
const CHARACTER_ID_RE = /^[a-z][a-z0-9_-]{0,31}$/;

/**
 * @typedef {{
 *   type: "tab" | "mode" | "character" | "settings" | "voice" | "lang" | "mic" | "close",
 *   value?: string | null,
 * }} UiIntent
 */

/**
 * @param {string} payload
 * @returns {UiIntent | null}
 */
export function parseUiPayload(payload) {
  const raw = String(payload || "").trim().toLowerCase();
  if (!raw) return null;
  const parts = raw.split(":").map((p) => p.trim()).filter(Boolean);
  const head = parts[0];

  if (head === "tab" && parts[1] && UI_TABS.includes(parts[1])) {
    return { type: "tab", value: parts[1] };
  }
  if (head === "mode" && parts[1] && UI_MODES.includes(parts[1])) {
    return { type: "mode", value: parts[1] };
  }
  if (head === "character") {
    const id = parts[1] || "pick";
    if (id === "pick" || id === "picker" || id === "choose") {
      return { type: "character", value: "pick" };
    }
    if (CHARACTER_ID_RE.test(id)) return { type: "character", value: id };
    return { type: "character", value: "pick" };
  }
  if (head === "settings" || head === "setting") {
    return { type: "settings" };
  }
  if (head === "voice") {
    return { type: "voice" };
  }
  if (head === "lang" || head === "language") {
    const lang = parts[1];
    if (lang === "en" || lang === "english") return { type: "lang", value: "en" };
    if (lang === "yue" || lang === "zh" || lang === "cantonese" || lang === "粵") {
      return { type: "lang", value: "yue" };
    }
    return { type: "lang", value: "yue" };
  }
  if (head === "mic") {
    const on = parts[1];
    if (on === "on" || on === "start") return { type: "mic", value: "on" };
    if (on === "off" || on === "stop") return { type: "mic", value: "off" };
    return { type: "mic", value: "on" };
  }
  if (head === "close" || head === "dismiss") {
    return { type: "close" };
  }

  if (UI_TABS.includes(head)) return { type: "tab", value: head };
  if (UI_MODES.includes(head)) return { type: "mode", value: head };
  if (CHARACTER_ID_RE.test(head)) return { type: "character", value: head };

  return null;
}

/**
 * @param {string | null | undefined} raw
 */
export function parseUiIntentTags(raw) {
  /** @type {UiIntent[]} */
  const intents = [];
  const stripped = String(raw || "").replace(UI_TAG_RE, (match, payload) => {
    const intent = parseUiPayload(payload);
    if (intent) intents.push(intent);
    return " ";
  });
  return {
    stripped: stripped.replace(/\s{2,}/g, " ").trim(),
    intents,
  };
}

/**
 * @param {string | null | undefined} text
 */
export function stripUiIntentTags(text) {
  return parseUiIntentTags(text).stripped;
}
