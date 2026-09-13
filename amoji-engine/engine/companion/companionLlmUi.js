/**
 * In-app LLM provider switcher — local + free cloud presets.
 */
import {
  formatLlmModeLabel,
  getLlmProvider,
  LLM_PROVIDER_STORAGE_KEY,
  LLM_PROVIDERS,
  readProviderApiKey,
  resolveProviderConfig,
  saveProviderApiKey,
} from "./companionLlmProviders.js";

export const COMPANION_LLM_UI_SCHEMA = "amoji.companionLlmUi.v1";

/**
 * @param {{
 *   container: HTMLElement,
 *   chat: { setProvider: (id: string, opts?: object) => object, mode: string },
 *   onMode?: (label: string) => void,
 *   onSystem?: (msg: string) => void,
 *   storage?: Storage | null,
 * }} opts
 */
export function createCompanionLlmSwitcher(opts) {
  const storage = opts.storage ?? globalThis.localStorage;
  const root = document.createElement("div");
  root.className = "llm-switcher";
  root.setAttribute("role", "toolbar");
  root.setAttribute("aria-label", "LLM provider");

  const label = document.createElement("span");
  label.className = "llm-switcher-label";
  label.textContent = "Brain";

  const track = document.createElement("div");
  track.className = "llm-switcher-track";

  /** @type {Record<string, HTMLButtonElement>} */
  const buttons = {};

  for (const provider of LLM_PROVIDERS) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "llm-chip";
    btn.dataset.provider = provider.id;
    btn.title = provider.description;
    btn.textContent = provider.short;
    btn.setAttribute("aria-pressed", "false");
    track.appendChild(btn);
    buttons[provider.id] = btn;
  }

  root.append(label, track);
  opts.container.appendChild(root);

  let storedId = storage?.getItem(LLM_PROVIDER_STORAGE_KEY) || "auto";
  if (storedId === "ollama") storedId = "ollama-qwen4";
  let activeId = storedId;

  const setActiveUi = (id) => {
    activeId = id;
    for (const [pid, btn] of Object.entries(buttons)) {
      const on = pid === id;
      btn.classList.toggle("active", on);
      btn.setAttribute("aria-pressed", on ? "true" : "false");
    }
  };

  const apply = (id, extra = {}) => {
    const provider = getLlmProvider(id);
    if (provider.needsKey && !readProviderApiKey(id, storage) && !extra.apiKey) {
      const key = globalThis.prompt?.(
        `${provider.label} API key (stored in this browser only):`,
        readProviderApiKey(id, storage),
      );
      if (!key) {
        opts.onSystem?.(`${provider.label} needs an API key — open ⚙ settings or try again`);
        return null;
      }
      saveProviderApiKey(id, key, storage);
      extra.apiKey = key;
    }

    const info = opts.chat.setProvider(id, extra);
    storage?.setItem(LLM_PROVIDER_STORAGE_KEY, id);
    setActiveUi(id);
    const labelText = formatLlmModeLabel(info.mode, info.model);
    opts.onMode?.(labelText);
    const modelNote =
      provider.id !== "basic" && info.model ? ` · ${info.model}` : "";
    opts.onSystem?.(`Switched to ${provider.label}${modelNote}`);
    return info;
  };

  for (const [id, btn] of Object.entries(buttons)) {
    btn.addEventListener("click", () => {
      if (id === activeId) return;
      apply(id);
    });
  }

  const pingProxy = async () => {
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: "__ping__", history: [] }),
      });
      const data = await res.json();
      if (data?.mode === "ollama") {
        opts.onMode?.(formatLlmModeLabel("ollama", data.model));
      } else if (data?.mode === "online") {
        opts.onMode?.(formatLlmModeLabel("online", data.model));
      } else if (activeId === "auto") {
        opts.onMode?.(formatLlmModeLabel("local"));
      }
    } catch {
      /* offline file open */
    }
  };

  setActiveUi(activeId);
  const initial = resolveProviderConfig(activeId, { storage });
  opts.chat.setProvider(activeId, { apiKey: initial.apiKey || undefined });
  void pingProxy();

  return {
    schema: COMPANION_LLM_UI_SCHEMA,
    root,
    get activeId() {
      return activeId;
    },
    apply,
    refreshPing: pingProxy,
  };
}
