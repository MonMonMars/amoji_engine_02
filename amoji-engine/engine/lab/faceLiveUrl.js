/**
 * Resolve Face Live WebSocket URL for lab / client.
 */
export const FACE_LIVE_URL_STORAGE_KEY = 'amoji.faceLiveUrl';

/**
 * @param {{
 *   search?: string,
 *   storage?: { getItem?: Function, setItem?: Function } | null,
 *   env?: Record<string, string | undefined>,
 *   defaultUrl?: string,
 * }} [opts]
 */
export function resolveFaceLiveConfig(opts = {}) {
  const env =
    opts.env ||
    (typeof process !== 'undefined' ? process.env : undefined) ||
    {};
  const search =
    opts.search ??
    (typeof globalThis.location !== 'undefined'
      ? globalThis.location.search
      : '');
  const storage =
    opts.storage === null
      ? null
      : opts.storage ||
        (typeof globalThis.localStorage !== 'undefined'
          ? globalThis.localStorage
          : null);
  const defaultUrl = opts.defaultUrl || 'ws://127.0.0.1:8765';

  let fromQuery = '';
  try {
    const params = new URLSearchParams(search || '');
    fromQuery = String(
      params.get('face') ||
        params.get('faceLive') ||
        params.get('AMOJI_FACE_LIVE_URL') ||
        '',
    ).trim();
  } catch {
    fromQuery = '';
  }

  const fromStorage = String(
    storage?.getItem?.(FACE_LIVE_URL_STORAGE_KEY) || '',
  ).trim();
  const fromEnv = String(env.AMOJI_FACE_LIVE_URL || '').trim();
  const url = fromQuery || fromStorage || fromEnv || defaultUrl;

  if (fromQuery && storage?.setItem) {
    try {
      storage.setItem(FACE_LIVE_URL_STORAGE_KEY, fromQuery);
    } catch {
      /* ignore */
    }
  }

  const source = fromQuery
    ? 'query'
    : fromStorage
      ? 'storage'
      : fromEnv
        ? 'env'
        : 'default';

  return { url, source, enabled: Boolean(url) };
}
