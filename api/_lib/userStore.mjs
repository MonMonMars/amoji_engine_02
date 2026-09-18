import fs from "node:fs/promises";
import path from "node:path";

export const USER_SAVE_SCHEMA = "amoji.userSave.v1";
export const USER_SETTINGS_SCHEMA = "amoji.userSettings.v1";

const memory = globalThis.__amojiUserStore || new Map();
globalThis.__amojiUserStore = memory;

/**
 * @returns {boolean}
 */
function useFilesystem() {
  return process.env.AMOJI_USER_STORE_FS === "1" || process.env.NODE_ENV !== "production";
}

/**
 * @returns {string}
 */
function dataDir() {
  return process.env.AMOJI_USER_DATA_DIR || path.join(process.cwd(), ".data", "users");
}

/**
 * @param {string} userId
 */
function userPath(userId) {
  const safe = userId.replace(/[^a-zA-Z0-9_-]/g, "_");
  return path.join(dataDir(), `${safe}.json`);
}

/**
 * @param {string} userId
 */
async function readFs(userId) {
  try {
    const raw = await fs.readFile(userPath(userId), "utf8");
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/**
 * @param {string} userId
 * @param {unknown} record
 */
async function writeFs(userId, record) {
  const dir = dataDir();
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(userPath(userId), JSON.stringify(record, null, 2), "utf8");
}

/**
 * @param {string} method
 * @param {string} key
 * @param {unknown} [value]
 */
async function upstash(method, key, value) {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  const endpoint =
    method === "GET"
      ? `${url}/get/${encodeURIComponent(key)}`
      : `${url}/set/${encodeURIComponent(key)}/${encodeURIComponent(JSON.stringify(value))}`;
  const res = await fetch(endpoint, {
    method: method === "GET" ? "GET" : "POST",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return null;
  const data = await res.json();
  if (method === "GET") {
    if (!data?.result) return null;
    try {
      return JSON.parse(data.result);
    } catch {
      return null;
    }
  }
  return true;
}

/**
 * @param {string} userId
 */
async function readRecord(userId) {
  const key = `amoji:user:${userId}`;
  const remote = await upstash("GET", key);
  if (remote) return remote;
  if (useFilesystem()) {
    const fsRecord = await readFs(userId);
    if (fsRecord) return fsRecord;
  }
  return memory.get(userId) || null;
}

/**
 * @param {string} userId
 * @param {Record<string, unknown>} record
 */
async function writeRecord(userId, record) {
  const key = `amoji:user:${userId}`;
  memory.set(userId, record);
  if (useFilesystem()) {
    await writeFs(userId, record);
  }
  await upstash("SET", key, record);
  return record;
}

/**
 * @param {string} userId
 */
export async function getUserRecord(userId) {
  const existing = await readRecord(userId);
  if (existing) return existing;
  const created = {
    userId,
    schema: USER_SAVE_SCHEMA,
    updatedAt: new Date().toISOString(),
    save: defaultSave(),
    settings: defaultSettings(),
    entitlements: defaultEntitlements(),
  };
  return writeRecord(userId, created);
}

/**
 * @param {string} userId
 * @param {Record<string, unknown>} patch
 */
export async function patchUserRecord(userId, patch) {
  const current = await getUserRecord(userId);
  const next = {
    ...current,
    ...patch,
    userId,
    updatedAt: new Date().toISOString(),
  };
  return writeRecord(userId, next);
}

export function defaultSave() {
  return {
    schema: USER_SAVE_SCHEMA,
    version: 1,
    treats: null,
    raising: null,
    chase: null,
    characters: {},
    lastCharacterId: "nova",
  };
}

export function defaultSettings() {
  return {
    schema: USER_SETTINGS_SCHEMA,
    lang: "yue",
    voiceEnabled: true,
    notifications: true,
    haptics: true,
    analyticsOptIn: false,
    premiumPreview: false,
  };
}

export function defaultEntitlements() {
  return {
    premium: false,
    unlimitedChat: false,
    characterPackIds: [],
    coinPacksGranted: 0,
    subscriptionExpiresAt: null,
  };
}

/**
 * Shallow merge client save blobs without dropping unknown keys.
 * @param {Record<string, unknown>} current
 * @param {Record<string, unknown>} incoming
 */
export function mergeSave(current, incoming) {
  const base = { ...defaultSave(), ...(current || {}) };
  const next = { ...base, ...(incoming || {}) };
  if (incoming?.characters && typeof incoming.characters === "object") {
    next.characters = { ...(base.characters || {}), ...incoming.characters };
  }
  return next;
}

/**
 * @param {Record<string, unknown>} current
 * @param {Record<string, unknown>} incoming
 */
export function mergeSettings(current, incoming) {
  return { ...defaultSettings(), ...(current || {}), ...(incoming || {}) };
}

/**
 * @param {Record<string, unknown>} current
 * @param {Record<string, unknown>} incoming
 */
export function mergeEntitlements(current, incoming) {
  const base = { ...defaultEntitlements(), ...(current || {}) };
  const next = { ...base, ...(incoming || {}) };
  if (Array.isArray(incoming?.characterPackIds)) {
    next.characterPackIds = Array.from(
      new Set([...(base.characterPackIds || []), ...incoming.characterPackIds]),
    );
  }
  return next;
}
