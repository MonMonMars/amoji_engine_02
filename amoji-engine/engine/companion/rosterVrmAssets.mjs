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

/** Upstream VRM sources (refreshed on deploy when REFRESH_ROSTER_VRM=1). */
export const ROSTER_VRM_SOURCE_URLS = Object.freeze({
  alicia:
    "https://raw.githubusercontent.com/vrm-c/UniVRM/master/Tests/Models/Alicia_vrm-0.51/AliciaSolid_vrm-0.51.vrm",
  amoji:
    "https://raw.githubusercontent.com/pixiv/three-vrm/dev/packages/three-vrm/examples/models/VRM1_Constraint_Twist_Sample.vrm",
  sakura: "https://arweave.net/Ea1KXujzJatQgCFSMzGOzp_UtHqB1pyia--U3AtkMAY",
  yume: "https://arweave.net/GZkfa0SNnrBWluRL_pXpakg7T3K3d4l87__wR4mD3UM",
  yuki: "https://arweave.net/MgsNlTetzAoVEC6E-lswj65vp7StkOZXXd5OjjqzYZI",
  hina: "https://arweave.net/x48D7v037irPQYG7e0vZLDV1E3x5-KookbP9-vaXvYE",
  mio: "https://arweave.net/1q4IQwLQXJVS0JGSpeXlRdazmZYdwJbmLbTv7o0s5Y8",
  nana: "https://gateway.pinata.cloud/ipfs/QmSpb8jZRtwDhpp7zjpfvU47GZyapmh8GvQApmzTxFcaLz/Avatar10_Neutral.vrm",
  robert: "https://arweave.net/gwG7w4bY-A5c3R6A6GOz3xBCgbPvkFQmqPIDtvnNsYI",
  mikel: "https://arweave.net/-eJyDjujQRvakRImdvulg-1dKQkPwMeQv-55IbKqLh4",
  mimi: "https://arweave.net/RymRtrmhHx_f9ZDvtvIQb1noTHvILdjoTg5G7L2DR-8",
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
    url: ROSTER_VRM_SOURCE_URLS.alicia,
    minBytes: 500_000,
  },
  {
    id: "ember",
    url: "https://vtubeme.com/media/free/ember/model.vrm",
    minBytes: 400_000,
  },
  { id: "sakura", url: ROSTER_VRM_SOURCE_URLS.sakura, minBytes: 100_000 },
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
  { id: "yume", url: ROSTER_VRM_SOURCE_URLS.yume, minBytes: 100_000 },
  {
    id: "sky",
    url: "https://vtubeme.com/media/free/sky/model.vrm",
    minBytes: 400_000,
  },
  { id: "yuki", url: ROSTER_VRM_SOURCE_URLS.yuki, minBytes: 100_000 },
  { id: "hina", url: ROSTER_VRM_SOURCE_URLS.hina, minBytes: 100_000 },
  { id: "mio", url: ROSTER_VRM_SOURCE_URLS.mio, minBytes: 100_000 },
  { id: "amoji", url: ROSTER_VRM_SOURCE_URLS.amoji, minBytes: 500_000 },
  {
    id: "rex",
    url: "https://vtubeme.com/media/free/kai/model.vrm",
    minBytes: 400_000,
  },
  { id: "nana", url: ROSTER_VRM_SOURCE_URLS.nana, minBytes: 100_000 },
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
  { id: "robert", url: ROSTER_VRM_SOURCE_URLS.robert, minBytes: 100_000 },
  { id: "mikel", url: ROSTER_VRM_SOURCE_URLS.mikel, minBytes: 100_000 },
  { id: "mimi", url: ROSTER_VRM_SOURCE_URLS.mimi, minBytes: 100_000 },
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
