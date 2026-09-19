/**
 * Small offline banner for the mobile app shell.
 */

/**
 * @param {(online: boolean) => void} [onChange]
 */
export function mountConnectivityBanner(onChange) {
  if (typeof document === "undefined") return () => {};
  let node = document.getElementById("amoji-connectivity");
  if (!node) {
    node = document.createElement("div");
    node.id = "amoji-connectivity";
    node.className = "connectivity-banner hidden";
    node.setAttribute("role", "status");
    document.body.appendChild(node);
  }

  const sync = () => {
    const online = typeof navigator !== "undefined" ? navigator.onLine !== false : true;
    node.textContent = online
      ? ""
      : document.documentElement.lang?.startsWith("en")
        ? "Offline — saves stay on this device"
        : "離線 — 存檔保留喺本機";
    node.classList.toggle("hidden", online);
    onChange?.(online);
  };

  sync();
  globalThis.addEventListener("online", sync);
  globalThis.addEventListener("offline", sync);
  return () => {
    globalThis.removeEventListener("online", sync);
    globalThis.removeEventListener("offline", sync);
  };
}
