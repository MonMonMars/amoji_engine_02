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
  "companion-rose.vrm": "sakura",
  "companion-avatarsample-a.vrm": "celeste",
  "companion-avatarsample-b.vrm": "mei",
  "companion-vroid-female.vrm": "luna",
  "companion-vroid-male.vrm": "atlas",
  "companion-erika.vrm": "yume",
  "companion-olivia.vrm": "yuki",
  "companion-lydia.vrm": "hina",
  "companion-kate.vrm": "mio",
  "companion-avatarsample-c.vrm": "yume",
  "companion-nova.vrm": "nova",
  "companion-alicia.vrm": "alicia",
  "companion-ember.vrm": "ember",
  "companion-sky.vrm": "sky",
  "companion-chibi.vrm": "pan",
  "companion-jennifer.vrm": "circle",
  "companion-polydancer.vrm": "drift",
  "companion-aesthetica.vrm": "face",
  "companion-rabbit.vrm": "pan",
  "companion-chad.vrm": "lantern",
  "companion-david.vrm": "pyre",
  "companion-hugo.vrm": "pan",
  "companion-shiro.vrm": "pan",
  "companion-rex.vrm": "cool",
  "companion-kai.vrm": "cool",
  "companion-nana.vrm": "pan",
  "companion-sumi.vrm": "circle",
  "companion-lumi.vrm": "drift",
  "companion-vera.vrm": "face",
  "companion-robert.vrm": "lantern",
  "companion-mikel.vrm": "pyre",
  "companion-mimi.vrm": "pan",
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
    id: "pyre",
    url: "https://arweave.net/Hc8Rd0EGKNHEevpm1D16BwP-LAPDS319Hvn0fualX_w",
    minBytes: 500_000,
  },
  {
    id: "pan",
    url: "https://arweave.net/aVB6TrTpPLAoPgZIG5lWwBh4ZdMfkeXmTcU1ybgwHuE",
    minBytes: 500_000,
  },
  {
    id: "circle",
    url: "https://arweave.net/0LR8vStpEzmWokIxQ9fnky4yYtY37xhmwFBvxxmBOXE",
    minBytes: 500_000,
  },
  {
    id: "face",
    url: "https://arweave.net/4eYMl57GgEBFpFF6VJvrsTXLHNSKdyT4jumee0LiPwk",
    minBytes: 500_000,
  },
  {
    id: "cool",
    url: "https://arweave.net/igaT6irIERD3pOhNF2vwFJ8he3ZAa5py9iYT_066M7M",
    minBytes: 500_000,
  },
  {
    id: "samplec",
    url: "https://raw.githubusercontent.com/madjin/vrm-samples/master/vroid/stable/AvatarSample_C.vrm",
    minBytes: 500_000,
  },
  {
    id: "lantern",
    url: "https://arweave.net/SpMyvJDbre5L1MwW2zPF5g0b5SdnTUPcmE7bE-uVtNk",
    minBytes: 500_000,
  },
  {
    id: "drift",
    url: "https://arweave.net/jPOg-G0MPH55ZQmamFhT9f8cHn-hjeAQ0mRO5gWeKMQ",
    minBytes: 500_000,
  },
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
