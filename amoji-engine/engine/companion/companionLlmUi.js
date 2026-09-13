/**
 * In-app LLM provider switcher — auto-connect, no API key prompts.
 */
import { hasAnyClientCloudKey } from "./companionClientKeys.js";
import {
  autoConnectLlm,
  isHostedCompanion,
  probeProviderAvailability,
} from "./companionLlmConnect.js";
import {
  formatLlmModeLabel,
  getLlmProvider,
  getVisibleLlmProviders,
  LLM_PROVIDER_STORAGE_KEY,
  readProviderApiKey,
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

  const hosted = isHostedCompanion();
  const visibleProviders = getVisibleLlmProviders(hosted);

  for (const provider of visibleProviders) {
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

  let activeId = "auto";
  /** @type {Record<string, boolean>} */
  let availability = {};

  const setActiveUi = (id) => {
    activeId = id;
    for (const [pid, btn] of Object.entries(buttons)) {
      const on = pid === id;
      btn.classList.toggle("active", on);
      btn.classList.toggle("unavailable", availability[pid] === false);
      btn.setAttribute("aria-pressed", on ? "true" : "false");
      btn.disabled = availability[pid] === false && pid !== "basic";
    }
  };

  const apply = (id, extra = {}) => {
    const provider = getLlmProvider(id);
    const hasClientKey =
      hosted &&
      (readProviderApiKey(id) ||
        (id === "auto" && hasAnyClientCloudKey()));
    if (availability[id] === false && !hasClientKey) {
      opts.onSystem?.(
        hosted
          ? `${provider.label} not available — tap ⚙ and paste a free API key`
          : `${provider.label} not available — start Ollama or add server API keys`,
      );
      return null;
    }

    const info = opts.chat.setProvider(id, extra);
    storage?.setItem(LLM_PROVIDER_STORAGE_KEY, id);
    setActiveUi(id);
    opts.onMode?.(formatLlmModeLabel(info.mode, info.model));
    const modelNote =
      provider.id !== "basic" && info.model ? ` · ${info.model}` : "";
    opts.onSystem?.(`Connected · ${provider.label}${modelNote}`);
    return info;
  };

  for (const [id, btn] of Object.entries(buttons)) {
    btn.addEventListener("click", () => {
      if (id === activeId) return;
      apply(id);
    });
  }

  const refreshAvailability = async () => {
    const connected = await autoConnectLlm({
      chat: opts.chat,
      fetchImpl: globalThis.fetch,
    });
    availability = probeProviderAvailability(
      connected.status,
      connected.directOllama,
    );
    activeId = connected.providerId;
    storage?.setItem(LLM_PROVIDER_STORAGE_KEY, activeId);
    setActiveUi(activeId);
    opts.onMode?.(
      formatLlmModeLabel(connected.info?.mode || "ollama", connected.info?.model),
    );
    if (connected.ok) {
      opts.onSystem?.(
        `Auto-connected · ${getLlmProvider(activeId).label} (${connected.reason})`,
      );
    } else if (connected.status?.hosted) {
      opts.onSystem?.(
        hasAnyClientCloudKey()
          ? "Cloud mode · using your saved API key"
          : "Cloud mode — tap ⚙ paste a free Groq/OpenRouter key from your phone, or use Basic",
      );
    } else {
      opts.onSystem?.(
        "No LLM detected — deploy online (see DEPLOY.md) or start Ollama locally",
      );
    }
    return connected;
  };

  void refreshAvailability();

  return {
    schema: COMPANION_LLM_UI_SCHEMA,
    root,
    get activeId() {
      return activeId;
    },
    apply,
    refreshAvailability,
  };
}
