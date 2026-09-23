/**
 * CC0 100Avatars refresh for roster slots Mon asked to replace (v523).
 * Policy: keep #1–11, #19 Yara, #23 Cleo, #27 Elio, #29 Zane on-disk meshes.
 * @see https://github.com/ToxSam/open-source-avatars
 */
export const ROSTER_MODEL_REFRESH_SCHEMA =
  "amoji.rosterModelRefresh.v523-keep-1-11-19-23-27-29";

/** @type {Record<string, { vrmUrl: string, thumbUrl?: string, sourceName: string }>} thumbUrl is registry art only — picker PNGs come from `npm run roster:previews`. */
export const ROSTER_REPLACED_VRM_SOURCES = Object.freeze({
  orion: {
    sourceName: "Knight",
    vrmUrl: "https://arweave.net/GssJhnk0HJsS6u3ZNN6fTk4TEL7g4AbVGoCztUgjAu0",
    thumbUrl: "https://arweave.net/0WM_fXQMgOIjmeHgFOSDxbrI454sfJE4-kMrJIf-aBk",
  },
  kael: {
    sourceName: "Samurai",
    vrmUrl: "https://arweave.net/wmTy-SEXxmlp847i1U1m2GziSGp-4T8qrZ77A32LlY8",
    thumbUrl: "https://arweave.net/L0jvuJwteYJ6QI66tTi_yRJKUS_v6xKV-LZxwEd0iYU",
  },
  mira: {
    sourceName: "Tiger",
    vrmUrl: "https://arweave.net/2EQ5wsstsJaFOG9LXq_gVFKKgM8bnfPa3axYJ-VS1ug",
    thumbUrl: "https://arweave.net/ykIvWqlTvC66lekANOqTgr7bqujwgOqrlmSzzLHhkJw",
  },
  sumire: {
    sourceName: "Leaf",
    vrmUrl: "https://arweave.net/U-506llBsdnnXn3uslKggDw5Qt-sdDlQAY4KLKvZsuU",
    thumbUrl: "https://arweave.net/ETEjeooyYc4NSqAxMskRz8rmwmto1AzGtPHSRWXSyHc",
  },
  rin: {
    sourceName: "Wolf",
    vrmUrl: "https://arweave.net/dtI-JA5uSmbJVa7w7294T_9AJ_jvfZVQx4QWFzYdvdQ",
    thumbUrl: "https://arweave.net/x1rPLwMioYN8Wb2NZgepcljcdFlt8t_uEfyh0GPTeog",
  },
  dex: {
    sourceName: "Fox",
    vrmUrl: "https://arweave.net/up4WzT0YJfXv9woGseCIQnBSq3eH8KWASJJbNtuvEWY",
    thumbUrl: "https://arweave.net/9J9ThGRe5O_tffp4lIaDZcjtq9jt7NFCuUciCzJMguY",
  },
  niko: {
    sourceName: "Jenny",
    vrmUrl: "https://arweave.net/kgTirc4OvUWbJhIKC2CB3_pYsYuB62KTj90IdE8s3sk",
    thumbUrl: "https://arweave.net/4a6_AfH-PHvFMXqja7V42pF9hCn9ceIj5z5NAsK2SSs",
  },
  thorn: {
    sourceName: "Petal",
    vrmUrl: "https://arweave.net/IUrUx8QMcaZDWLSOPWz8UiM5bq-sR3dXAQwwmIeiOBE",
    thumbUrl: "https://arweave.net/rCNiCp4lKqER0apNMjGNNWgbexhlWip2mmpuXXfDZUg",
  },
  vesper: {
    sourceName: "Beach",
    vrmUrl: "https://arweave.net/uKhDMselhdUyeJKjelpuVsL8s-a9v_Wqq75TQfCfnos",
    thumbUrl: "https://arweave.net/EGCdxkfTjjmNS4RGiAT_or17mG3717qnZ7R1EnZxLg8",
  },
  ash: {
    sourceName: "Pirate",
    vrmUrl: "https://arweave.net/f6VUW6sCyJcjErrBWSu_MVlYMkmAx5CRpyNGedUNxHM",
    thumbUrl: "https://arweave.net/Ux83EJOk2ZN8QkhsdKm9kjkd_foX8Wmek5wBfJJWTr0",
  },
  sienna: {
    sourceName: "AvatarSample_C",
    vrmUrl:
      "https://raw.githubusercontent.com/madjin/vrm-samples/master/vroid/stable/AvatarSample_C.vrm",
  },
  luna: {
    sourceName: "Robert",
    vrmUrl: "https://arweave.net/gwG7w4bY-A5c3R6A6GOz3xBCgbPvkFQmqPIDtvnNsYI",
  },
  juno: {
    sourceName: "Mimi",
    vrmUrl: "https://arweave.net/RymRtrmhHx_f9ZDvtvIQb1noTHvILdjoTg5G7L2DR-8",
  },
  hana: {
    sourceName: "Avatar10_Neutral",
    vrmUrl:
      "https://gateway.pinata.cloud/ipfs/QmSpb8jZRtwDhpp7zjpfvU47GZyapmh8GvQApmzTxFcaLz/Avatar10_Neutral.vrm",
  },
  priya: {
    sourceName: "Mikel",
    vrmUrl: "https://arweave.net/-eJyDjujQRvakRImdvulg-1dKQkPwMeQv-55IbKqLh4",
  },
  cyrus: {
    sourceName: "BotBunny",
    vrmUrl: "https://arweave.net/4aox7v4AJVWR5oVxIMcqHbreKDDDHFnePhhPpVwkqnc",
    thumbUrl: "https://arweave.net/C_FHoVEdlCdGZHEGDXzV_i5D-BPfE7djIid2989z4wk",
  },
});

export const ROSTER_KEEP_MODEL_NUMBERS = Object.freeze([
  1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 19, 23, 27, 29,
]);
