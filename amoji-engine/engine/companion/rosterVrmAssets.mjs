/**
 * Canonical on-disk VRM path per roster character id.
 * Filenames match picker ids so deploys cannot serve the wrong rig for a card.
 */
import { GEN3_ROSTER_SLOTS } from "./companionRosterGen3Data.mjs";
const VRoidSampleA =
  "https://raw.githubusercontent.com/madjin/vrm-samples/master/vroid/stable/AvatarSample_A.vrm";
const VRoidSampleC =
  "https://raw.githubusercontent.com/madjin/vrm-samples/master/vroid/stable/AvatarSample_C.vrm";
const VRoidFem =
  "https://raw.githubusercontent.com/madjin/vrm-samples/master/vroid/fem_vroid.vrm";

export const ROSTER_VRM_ASSETS_SCHEMA = "amoji.rosterVrmAssets.v2-gen3";

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
  "companion-rose.vrm": "mei",
  "companion-avatarsample-a.vrm": "mei",
  "companion-avatarsample-b.vrm": "mei",
  "companion-vroid-female.vrm": "mei",
  "companion-vroid-male.vrm": "atlas",
  "companion-erika.vrm": "mei",
  "companion-sakura.vrm": "sakura",
  "companion-celeste.vrm": "celeste",
  "companion-luna.vrm": "luna",
  "companion-yume.vrm": "yume",
  "companion-olivia.vrm": "yuki",
  "companion-lydia.vrm": "hina",
  "companion-kate.vrm": "mio",
  "companion-avatarsample-c.vrm": "mei",
  "companion-nova.vrm": "nova",
  "companion-alicia.vrm": "alicia",
  "companion-ember.vrm": "ember",
  "companion-sky.vrm": "sky",
  "companion-chibi.vrm": "fox",
  "companion-jennifer.vrm": "jenny",
  "companion-polydancer.vrm": "tiger",
  "companion-aesthetica.vrm": "petal",
  "companion-rabbit.vrm": "fox",
  "companion-chad.vrm": "samurai",
  "companion-david.vrm": "knight",
  "companion-hugo.vrm": "fox",
  "companion-shiro.vrm": "fox",
  "companion-rex.vrm": "wolf",
  "companion-kai.vrm": "wolf",
  "companion-nana.vrm": "fox",
  "companion-sumi.vrm": "jenny",
  "companion-lumi.vrm": "tiger",
  "companion-vera.vrm": "petal",
  "companion-robert.vrm": "samurai",
  "companion-mikel.vrm": "knight",
  "companion-mimi.vrm": "fox",
  "companion-pyre.vrm": "knight",
  "companion-pan.vrm": "fox",
  "companion-circle.vrm": "jenny",
  "companion-face.vrm": "petal",
  "companion-cool.vrm": "wolf",
  "companion-samplec.vrm": "leaf",
  "companion-lantern.vrm": "samurai",
  "companion-drift.vrm": "tiger",
});

/** Upstream VRM sources (refreshed on deploy when REFRESH_ROSTER_VRM=1). */
export const ROSTER_VRM_SOURCE_URLS = Object.freeze({
  alicia:
    "https://raw.githubusercontent.com/vrm-c/UniVRM/master/Tests/Models/Alicia_vrm-0.51/AliciaSolid_vrm-0.51.vrm",
  amoji:
    "https://raw.githubusercontent.com/pixiv/three-vrm/dev/packages/three-vrm/examples/models/VRM1_Constraint_Twist_Sample.vrm",
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
  {
    id: "mei",
    url: "https://raw.githubusercontent.com/madjin/vrm-samples/master/vroid/stable/AvatarSample_B.vrm",
    minBytes: 500_000,
  },
  {
    id: "atlas",
    url: "https://raw.githubusercontent.com/madjin/vrm-samples/master/vroid/masc_vroid.vrm",
    minBytes: 500_000,
  },
  {
    id: "sky",
    url: "https://vtubeme.com/media/free/sky/model.vrm",
    minBytes: 400_000,
  },
  { id: "yuki", url: ROSTER_VRM_SOURCE_URLS.yuki, minBytes: 100_000 },
  { id: "hina", url: ROSTER_VRM_SOURCE_URLS.hina, minBytes: 100_000 },
  { id: "mio", url: ROSTER_VRM_SOURCE_URLS.mio, minBytes: 100_000 },
  { id: "amoji", url: ROSTER_VRM_SOURCE_URLS.amoji, minBytes: 500_000 },
  ...GEN3_ROSTER_SLOTS.map((slot) => ({
    id: slot.id,
    url: slot.vrmUrl,
    minBytes: 400_000,
  })),
  { id: "sakura", url: VRoidSampleA, minBytes: 500_000 },
  { id: "luna", url: VRoidFem, minBytes: 500_000 },
  { id: "celeste", url: VRoidSampleC, minBytes: 500_000 },
  { id: "yume", copyFrom: "companion-erika.vrm", minBytes: 500_000 },
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
