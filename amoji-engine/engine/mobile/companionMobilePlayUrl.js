/**
 * Build `/play` query for the mobile app companion iframe & full-screen links.
 */
import { isVoiceOutputDisabled } from "../companion/companionVoiceCatalog.js";
import { normalizeCompanionRole } from "./companionRolePresets.js";

export { isVoiceOutputDisabled };

/**
 * @param {{
 *   lang?: string,
 *   characterId?: string,
 *   role?: string,
 *   voiceEnabled?: boolean,
 *   build?: string | null,
 *   pick?: "0" | "1",
 * }} opts
 */
export function buildMobileCompanionPlayPath(opts = {}) {
  const lang = opts.lang === "en" ? "en" : "yue";
  const role = normalizeCompanionRole(opts.role || "girlfriend");
  const characterId = String(opts.characterId || "nova").toLowerCase();
  const pick = opts.pick === "1" ? "1" : "0";
  const voiceEnabled = opts.voiceEnabled !== false;

  const params = new URLSearchParams();
  params.set("lang", lang);
  params.set("mobile", "1");
  params.set("character", characterId);
  params.set("role", role);
  params.set("pick", pick);
  params.set("automic", "0");
  if (voiceEnabled) {
    params.set("voice", "openai-coral");
  } else {
    params.set("voice", "off");
  }
  if (role === "secretary") params.set("tab", "today");
  const build = String(opts.build || "").trim();
  if (build) params.set("build", build);
  return `/play?${params.toString()}`;
}
