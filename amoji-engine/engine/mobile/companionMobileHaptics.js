/**
 * Optional haptic feedback on native (Capacitor Haptics).
 */
import { loadMobileSettings } from "./companionMobileSettings.js";

/**
 * @param {"light"|"medium"|"heavy"} [style]
 */
export async function hapticTap(style = "light") {
  if (!loadMobileSettings().haptics) return;
  const cap = globalThis.Capacitor;
  if (!cap?.isNativePlatform?.()) return;
  const Haptics = cap.Plugins?.Haptics;
  if (!Haptics?.impact) return;
  const impactStyle = style === "heavy" ? "HEAVY" : style === "medium" ? "MEDIUM" : "LIGHT";
  try {
    await Haptics.impact({ style: impactStyle });
  } catch {
    /* ignore */
  }
}
