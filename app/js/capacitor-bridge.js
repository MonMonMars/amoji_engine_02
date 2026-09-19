/**
 * Native shell hooks (Capacitor WebView). No-op in mobile browser.
 * @param {{ getScreen: () => string, navigate: (name: string) => Promise<void> }} router
 */
export function initCapacitorBridge(router) {
  const cap = globalThis.Capacitor;
  if (!cap?.isNativePlatform?.()) return;

  const plugins = cap.Plugins || {};
  plugins.SplashScreen?.hide?.().catch?.(() => {});

  plugins.StatusBar?.setStyle?.({ style: "DARK" }).catch?.(() => {});
  plugins.StatusBar?.setBackgroundColor?.({ color: "#070a12" }).catch?.(() => {});

  plugins.App?.addListener?.("backButton", () => {
    const screen = router.getScreen?.() || "title";
    if (screen === "hub" || screen === "title") {
      plugins.App?.exitApp?.();
      return;
    }
    if (screen === "login") {
      void router.navigate("title");
      return;
    }
    void router.navigate("hub");
  });
}
