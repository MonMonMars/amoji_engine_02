/**
 * Canonical on-disk VRM path per roster character id.
 * Filenames match picker ids so deploys cannot serve the wrong rig for a card.
 */
export const ROSTER_VRM_ASSETS_SCHEMA = "amoji.rosterVrmAssets.v1";

/** @param {string} characterId */
export function rosterVrmBasename(characterId) {
  const id = String(characterId || "nova").toLowerCase();
  return `companion-${id}.vrm`;
}

/** @param {string} characterId */
export function rosterModelUrl(characterId) {
  return `/prototypes/assets/${rosterVrmBasename(characterId)}`;
}

/** Previous basenames kept for legacy URL + deep-link resolution. */
export const LEGACY_VRM_BASENAME_ALIASES = Object.freeze({
  "kizuna-kamatte.vrm": "kizuna",
  "companion-girl.vrm": "amoji",
  "companion-kai.vrm": "rex",
  "companion-rose.vrm": "sakura",
  "companion-avatarsample-a.vrm": "celeste",
  "companion-avatarsample-b.vrm": "mei",
  "companion-vroid-female.vrm": "luna",
  "companion-vroid-male.vrm": "atlas",
  "companion-erika.vrm": "yume",
  "companion-olivia.vrm": "yuki",
  "companion-lydia.vrm": "hina",
  "companion-kate.vrm": "mio",
  "companion-chibi.vrm": "nana",
  "companion-jennifer.vrm": "sumi",
  "companion-polydancer.vrm": "lumi",
  "companion-aesthetica.vrm": "vera",
  "companion-rabbit.vrm": "mimi",
  "companion-nova.vrm": "nova",
  "companion-alicia.vrm": "alicia",
  "companion-ember.vrm": "ember",
  "companion-sky.vrm": "sky",
  "companion-robert.vrm": "robert",
  "companion-mikel.vrm": "mikel",
  "companion-chad.vrm": "robert",
  "companion-david.vrm": "mikel",
  "companion-hugo.vrm": "mimi",
  "companion-shiro.vrm": "nana",
  "companion-avatarsample-c.vrm": "yume",
});

/**
 * @type {{ id: string, url?: string, copyFrom?: string, minBytes?: number }[]}
 */
export const ROSTER_VRM_DOWNLOADS = [
  {
    id: "nova",
    url: "https://vtubeme.com/media/free/nova/model.vrm",
    minBytes: 500_000,
  },
  { id: "kizuna", copyFrom: "kizuna-kamatte.vrm", minBytes: 1_000_000 },
  {
    id: "alicia",
    copyFrom: "companion-alicia.vrm",
    minBytes: 500_000,
  },
  {
    id: "ember",
    url: "https://vtubeme.com/media/free/ember/model.vrm",
    minBytes: 400_000,
  },
  { id: "sakura", copyFrom: "companion-rose.vrm", minBytes: 100_000 },
  {
    id: "celeste",
    url: "https://raw.githubusercontent.com/madjin/vrm-samples/master/vroid/stable/AvatarSample_A.vrm",
    minBytes: 500_000,
  },
  {
    id: "mei",
    url: "https://raw.githubusercontent.com/madjin/vrm-samples/master/vroid/stable/AvatarSample_B.vrm",
    minBytes: 500_000,
  },
  {
    id: "luna",
    url: "https://raw.githubusercontent.com/madjin/vrm-samples/master/vroid/fem_vroid.vrm",
    minBytes: 500_000,
  },
  {
    id: "atlas",
    url: "https://raw.githubusercontent.com/madjin/vrm-samples/master/vroid/masc_vroid.vrm",
    minBytes: 500_000,
  },
  { id: "yume", copyFrom: "companion-erika.vrm", minBytes: 100_000 },
  {
    id: "sky",
    url: "https://vtubeme.com/media/free/sky/model.vrm",
    minBytes: 400_000,
  },
  { id: "yuki", copyFrom: "companion-olivia.vrm", minBytes: 100_000 },
  { id: "hina", copyFrom: "companion-lydia.vrm", minBytes: 100_000 },
  { id: "mio", copyFrom: "companion-kate.vrm", minBytes: 100_000 },
  { id: "amoji", copyFrom: "companion-girl.vrm", minBytes: 500_000 },
  {
    id: "rex",
    url: "https://vtubeme.com/media/free/kai/model.vrm",
    minBytes: 400_000,
  },
  { id: "nana", copyFrom: "companion-chibi.vrm", minBytes: 100_000 },
  {
    id: "sumi",
    url: "https://arweave.net/LKp1uJLAZFmncdCNSZ8oopU7ZElXTvn4BmM4CUcFclc",
    minBytes: 100_000,
  },
  {
    id: "lumi",
    url: "https://arweave.net/jPOg-G0MPH55ZQmamFhT9f8cHn-hjeAQ0mRO5gWeKMQ",
    minBytes: 100_000,
  },
  {
    id: "vera",
    url: "https://arweave.net/orNIoMYKafN-EyZRft2No1ZQsPNl3XUcMXhfT2rKQVc",
    minBytes: 100_000,
  },
  { id: "robert", copyFrom: "companion-robert.vrm", minBytes: 100_000 },
  { id: "mikel", copyFrom: "companion-mikel.vrm", minBytes: 100_000 },
  { id: "mimi", copyFrom: "companion-rabbit.vrm", minBytes: 100_000 },
];

export function rosterDownloadIds() {
  return ROSTER_VRM_DOWNLOADS.map((e) => e.id);
}

/** @param {string} id */
export function rosterDownloadEntry(id) {
  return ROSTER_VRM_DOWNLOADS.find(
    (e) => e.id === String(id || "").toLowerCase(),
  );
}

/**
 * @param {readonly string[]} rosterIds
 */
export function assertRosterDownloadCoverage(rosterIds) {
  const missing = rosterIds.filter(
    (id) => !ROSTER_VRM_DOWNLOADS.some((e) => e.id === id),
  );
  if (missing.length) {
    throw new Error(`ROSTER_VRM_DOWNLOADS missing ids: ${missing.join(", ")}`);
  }
}
