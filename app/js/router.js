/** @typedef {"title"|"login"|"hub"|"companion"|"pet"|"chase"|"shop"|"settings"} ScreenName */

/** @type {ScreenName} */
let currentScreen = "title";

/** @type {Map<ScreenName, (ctx: AppContext) => HTMLElement | Promise<HTMLElement>>} */
const routes = new Map();

/** @type {AppContext | null} */
let appContext = null;

/**
 * @typedef {object} AppContext
 * @property {HTMLElement} root
 * @property {() => boolean} isEnglish
 * @property {() => Record<string, unknown>} getSession
 * @property {(patch: Record<string, unknown>) => void} setSession
 * @property {(name: ScreenName, params?: Record<string, unknown>) => Promise<void>} navigate
 * @property {(message: string) => void} toast
 * @property {string} baseUrl
 */

/**
 * @param {ScreenName} name
 * @param {(ctx: AppContext) => HTMLElement | Promise<HTMLElement>} render
 */
export function registerRoute(name, render) {
  routes.set(name, render);
}

/**
 * @param {AppContext} ctx
 */
export function initRouter(ctx) {
  appContext = ctx;
}

/**
 * @returns {ScreenName}
 */
export function getCurrentScreen() {
  return currentScreen;
}

/**
 * @param {ScreenName} name
 * @param {Record<string, unknown>} [params]
 */
export async function navigate(name, params = {}) {
  if (!appContext) throw new Error("Router not initialized");
  const render = routes.get(name);
  if (!render) throw new Error(`Unknown screen: ${name}`);
  currentScreen = name;
  appContext.root.replaceChildren();
  appContext.root.dataset.screen = name;
  const node = await render({ ...appContext, params });
  appContext.root.appendChild(node);
}
