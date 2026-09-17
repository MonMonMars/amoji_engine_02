/**
 * One toggle for pet-care / raising UI — keeps the stage clean by default.
 * Snack opens the treat sheet; talk/walk run raising actions then collapse.
 */
import { ACTIVITY_COMMANDS, activityCommandLabel } from "./companionRaisingUi.js";

export const COMPANION_CARE_TOOLS_SCHEMA = "amoji.companionCareTools.v1";

/**
 * @param {{
 *   root?: HTMLElement | null,
 *   isEnglish?: boolean | (() => boolean),
 *   onActivity?: (kind: string) => void,
 *   onOpenChange?: (open: boolean) => void,
 * }} [opts]
 */
export function createCompanionCareTools(opts = {}) {
  const root = opts.root || document.body;
  const english = () =>
    typeof opts.isEnglish === "function"
      ? Boolean(opts.isEnglish())
      : Boolean(opts.isEnglish);

  let open = false;
  let hungry = false;
  let lonely = false;

  const toggle = document.createElement("button");
  toggle.type = "button";
  toggle.className = "care-tools-toggle";
  toggle.id = "care-tools-toggle";
  toggle.setAttribute("aria-expanded", "false");
  toggle.setAttribute("aria-haspopup", "true");

  const menu = document.createElement("div");
  menu.className = "care-tools-menu";
  menu.id = "care-tools-menu";
  menu.hidden = true;
  menu.setAttribute("role", "menu");

  const paintToggle = () => {
    const en = english();
    toggle.setAttribute(
      "aria-label",
      en
        ? open
          ? "Hide care tools"
          : "Show care tools — snack, talk, walk"
        : open
          ? "收起照顧工具"
          : "照顧工具 — 小食、傾偈、散步",
    );
    toggle.innerHTML = `<span class="care-tools-toggle__icon" aria-hidden="true">${hungry ? "🍽️" : "💗"}</span>`;
    toggle.classList.toggle("is-hungry", hungry);
    toggle.classList.toggle("is-lonely", lonely && !hungry);
  };

  const paintMenu = () => {
    menu.replaceChildren(
      ...ACTIVITY_COMMANDS.map((cmd) => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "care-tools-menu__btn";
        btn.dataset.activity = cmd.kind;
        btn.setAttribute("role", "menuitem");
        btn.setAttribute("aria-label", activityCommandLabel(cmd, english()));
        btn.innerHTML = `<span class="care-tools-menu__icon" aria-hidden="true">${cmd.icon}</span>`;
        btn.addEventListener("click", () => {
          opts.onActivity?.(cmd.kind);
          if (cmd.kind === "snack") openPanel(false);
          else close();
        });
        return btn;
      }),
    );
  };

  let menuVisible = false;

  const applyBodyState = () => {
    document.body.classList.toggle("companion-care-collapsed", !open);
    document.body.classList.toggle("companion-care-open", open);
    menu.hidden = !menuVisible;
    toggle.setAttribute("aria-expanded", menuVisible ? "true" : "false");
    toggle.classList.toggle("is-open", menuVisible);
    paintToggle();
  };

  const hideMenu = () => {
    menuVisible = false;
    menu.hidden = true;
    toggle.setAttribute("aria-expanded", "false");
    toggle.classList.remove("is-open");
  };

  const showMenu = () => {
    menuVisible = true;
    menu.hidden = false;
    toggle.setAttribute("aria-expanded", "true");
    toggle.classList.add("is-open");
  };

  const openPanel = (withMenu = true) => {
    const wasOpen = open;
    open = true;
    menuVisible = withMenu;
    applyBodyState();
    if (!wasOpen) opts.onOpenChange?.(true);
  };

  const close = () => {
    if (!open) return;
    open = false;
    menuVisible = false;
    applyBodyState();
    opts.onOpenChange?.(false);
  };

  const togglePanel = () => {
    if (!open) openPanel(true);
    else if (menuVisible) close();
    else showMenu();
  };

  toggle.addEventListener("click", (ev) => {
    ev.stopPropagation();
    togglePanel();
  });

  document.addEventListener("click", (ev) => {
    if (!open) return;
    if (toggle.contains(ev.target) || menu.contains(ev.target)) return;
    if (menuVisible) {
      hideMenu();
      applyBodyState();
    } else close();
  });

  document.addEventListener("keydown", (ev) => {
    if (ev.key !== "Escape" || !open) return;
    if (menuVisible) {
      hideMenu();
      applyBodyState();
    } else close();
  });

  root.appendChild(menu);
  root.appendChild(toggle);
  paintMenu();
  applyBodyState();

  return {
    schema: COMPANION_CARE_TOOLS_SCHEMA,
    toggle,
    menu,
    open: openPanel,
    close,
    hideMenu,
    togglePanel,
    isOpen: () => open,
    isMenuVisible: () => menuVisible,
    setNeedsHint: ({ hungry: h, lonely: l } = {}) => {
      hungry = Boolean(h);
      lonely = Boolean(l);
      paintToggle();
    },
    refreshLabels: () => {
      paintMenu();
      paintToggle();
    },
    dispose: () => {
      close();
      toggle.remove();
      menu.remove();
      document.body.classList.remove("companion-care-collapsed", "companion-care-open");
    },
  };
}
