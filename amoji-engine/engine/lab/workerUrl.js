/**
 * Resolve lab / client voice worker URL from query, storage, or env.
 */
export const WORKER_URL_STORAGE_KEY = 'amoji.voiceWorkerUrl';

/**
 * @param {{
 *   search?: string,
 *   storage?: { getItem?: Function, setItem?: Function } | null,
 *   env?: Record<string, string | undefined>,
 * }} [opts]
 * @returns {{ workerUrl: string, mode: 'mock' | 'http', source: string }}
 */
export function resolveVoiceWorkerConfig(opts = {}) {
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

  let fromQuery = '';
  try {
    const params = new URLSearchParams(search || '');
    fromQuery = String(params.get('worker') || params.get('AMOJI_VOICE_WORKER') || '').trim();
  } catch {
    fromQuery = '';
  }

  const fromStorage = String(storage?.getItem?.(WORKER_URL_STORAGE_KEY) || '').trim();
  const fromEnv = String(env.AMOJI_VOICE_WORKER || '').trim();

  const workerUrl = fromQuery || fromStorage || fromEnv || '';
  if (fromQuery && storage?.setItem) {
    try {
      storage.setItem(WORKER_URL_STORAGE_KEY, fromQuery);
    } catch {
      /* ignore quota */
    }
  }

  if (!workerUrl) {
    return { workerUrl: '', mode: 'mock', source: 'default' };
  }
  const source = fromQuery ? 'query' : fromStorage ? 'storage' : 'env';
  return { workerUrl, mode: 'http', source };
}
