/**
 * Client-side auth for Amoji mobile shell — guest + Apple Sign In + session restore.
 */
export const COMPANION_MOBILE_AUTH_SCHEMA = "amoji.companionMobileAuth.v1";
export const AUTH_STORAGE_KEY = "amoji.mobile.auth.v1";

/**
 * @param {string} [baseUrl]
 */
export function resolveApiBase(baseUrl) {
  if (baseUrl) return baseUrl.replace(/\/$/, "");
  if (typeof globalThis.location !== "undefined") {
    return globalThis.location.origin.replace(/\/$/, "");
  }
  return "";
}

/**
 * @param {Pick<Storage, "getItem" | "setItem" | "removeItem"> | null | undefined} storage
 */
export function loadAuthSession(storage = globalThis.localStorage) {
  try {
    const raw = storage?.getItem?.(AUTH_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.token || !parsed?.userId) return null;
    return parsed;
  } catch {
    return null;
  }
}

/**
 * @param {Record<string, unknown>} session
 * @param {Pick<Storage, "setItem"> | null | undefined} storage
 */
export function saveAuthSession(session, storage = globalThis.localStorage) {
  try {
    storage?.setItem?.(AUTH_STORAGE_KEY, JSON.stringify(session));
  } catch {
    /* private mode */
  }
  return session;
}

/**
 * @param {Pick<Storage, "removeItem"> | null | undefined} storage
 */
export function clearAuthSession(storage = globalThis.localStorage) {
  try {
    storage?.removeItem?.(AUTH_STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

/**
 * @param {string} path
 * @param {RequestInit & { baseUrl?: string }} [opts]
 */
export async function apiFetch(path, opts = {}) {
  const base = resolveApiBase(opts.baseUrl);
  const url = `${base}${path.startsWith("/") ? path : `/${path}`}`;
  const headers = {
    "Content-Type": "application/json",
    ...(opts.headers || {}),
  };
  const res = await fetch(url, { ...opts, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data?.error || `HTTP ${res.status}`);
    err.status = res.status;
    err.payload = data;
    throw err;
  }
  return data;
}

/**
 * @param {{ baseUrl?: string, deviceId?: string, storage?: Storage }} [opts]
 */
export async function signInGuest(opts = {}) {
  const deviceId =
    opts.deviceId ||
    (typeof globalThis.crypto?.randomUUID === "function"
      ? globalThis.crypto.randomUUID()
      : `guest_${Date.now()}`);
  const data = await apiFetch("/api/auth/guest", {
    method: "POST",
    baseUrl: opts.baseUrl,
    body: JSON.stringify({ deviceId }),
  });
  const session = {
    userId: data.userId,
    token: data.token,
    provider: data.provider,
    displayName: "Guest",
  };
  saveAuthSession(session, opts.storage);
  return session;
}

/**
 * @param {{
 *   identityToken: string,
 *   email?: string,
 *   displayName?: string,
 *   baseUrl?: string,
 *   storage?: Storage,
 * }} opts
 */
export async function signInApple(opts) {
  const data = await apiFetch("/api/auth/apple", {
    method: "POST",
    baseUrl: opts.baseUrl,
    body: JSON.stringify({
      identityToken: opts.identityToken,
      email: opts.email,
      displayName: opts.displayName,
    }),
  });
  const session = {
    userId: data.userId,
    token: data.token,
    provider: data.provider,
    displayName: opts.displayName || data.displayName || "Apple Player",
    email: data.email || opts.email || "",
  };
  saveAuthSession(session, opts.storage);
  return session;
}

/**
 * @param {{ baseUrl?: string, storage?: Storage }} [opts]
 */
export async function restoreSession(opts = {}) {
  const cached = loadAuthSession(opts.storage);
  if (!cached?.token) return null;
  try {
    const data = await apiFetch("/api/auth/session", {
      method: "GET",
      baseUrl: opts.baseUrl,
      headers: { Authorization: `Bearer ${cached.token}` },
    });
    const session = {
      ...cached,
      displayName: data.displayName || cached.displayName,
      entitlements: data.entitlements,
      settings: data.settings,
    };
    saveAuthSession(session, opts.storage);
    return session;
  } catch {
    clearAuthSession(opts.storage);
    return null;
  }
}

/**
 * @param {string} token
 * @param {{ baseUrl?: string }} [opts]
 */
export function authHeaders(token, opts = {}) {
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
    ...(opts.baseUrl ? {} : {}),
  };
}
