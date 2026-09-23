/**
 * CC0 100Avatars refresh for roster slots #12–28, #30–31.
 * Policy: keep #1–11 + #29 (Zane) meshes; replace all other on-disk VRMs.
 * @see https://github.com/ToxSam/open-source-avatars
 */
export const ROSTER_MODEL_REFRESH_SCHEMA = "amoji.rosterModelRefresh.v522-keep-1-11-29";

/** @type {Record<string, { vrmUrl: string, thumbUrl?: string, sourceName: string }>} thumbUrl is registry art only — picker PNGs come from `npm run roster:previews`. */
export const ROSTER_REPLACED_VRM_SOURCES = Object.freeze({
  orion: {
    sourceName: "Erika",
    vrmUrl: "https://arweave.net/GZkfa0SNnrBWluRL_pXpakg7T3K3d4l87__wR4mD3UM",
    thumbUrl: "https://arweave.net/C3HkA5xa9jXxSySEJCZEhtrFkrCyccD4RR25QfXIpyE",
  },
  kael: {
    sourceName: "Rose",
    vrmUrl: "https://arweave.net/Ea1KXujzJatQgCFSMzGOzp_UtHqB1pyia--U3AtkMAY",
    thumbUrl: "https://arweave.net/MsKV9G8Dvzv1rOfU8aCLlxZ2PtzQ-J9ijkdkFU-ExPo",
  },
  mira: {
    sourceName: "Polydancer",
    vrmUrl: "https://arweave.net/jPOg-G0MPH55ZQmamFhT9f8cHn-hjeAQ0mRO5gWeKMQ",
    thumbUrl: "https://arweave.net/SUPfb9dzBeLUUpJaEjGPGDkEE_6PylCs3_wU_Em69LM",
  },
  sumire: {
    sourceName: "Jennifer",
    vrmUrl: "https://arweave.net/LKp1uJLAZFmncdCNSZ8oopU7ZElXTvn4BmM4CUcFclc",
    thumbUrl: "https://arweave.net/5DKYpuaEX8Fal3eONiT3AZdzz4sKF2-Uv0HOnk5ks-8",
  },
  rin: {
    sourceName: "Chill",
    vrmUrl: "https://arweave.net/JCzmV7mgqDGNDu8YkdSMeJApOA09CCL2i71BqvJKCVs",
    thumbUrl: "https://arweave.net/Gz2Lwo5DL3_6GttFePNwNwIZYzXnQXxKvcEM6bLIcKM",
  },
  dex: {
    sourceName: "Retroman",
    vrmUrl: "https://arweave.net/N7Ps0Ad5RNr8JVyTFr0YM5tzlUJvAxeJ362XNn1j86E",
    thumbUrl: "https://arweave.net/bSXmDVe_7HWfOXJTdhGmTCnvhPn_0MVpLRUwKDZrvms",
  },
  niko: {
    sourceName: "Samuela",
    vrmUrl: "https://arweave.net/4VjBzmk3iDQS0-013pUMFpFYbKGNTL4qcQ-PVwADxk4",
    thumbUrl: "https://arweave.net/IcM8jehLXCuW088P8GACx39noyVRY9OFU69BLQM3GI4",
  },
  yara: {
    sourceName: "Juanita",
    vrmUrl: "https://arweave.net/nyMyZZx5lN2DXsmBgbGQSnt3PuXYN7AAjz9QJrjitLo",
    thumbUrl: "https://arweave.net/5RHeIXD9fezkpuFJS1TRtGkNIVfTKZP7Rkmh9pDmaTs",
  },
  thorn: {
    sourceName: "Agnes",
    vrmUrl: "https://arweave.net/c8mrbRq29sfQdovW1l_D2JYGOaCNF3JxTaUsmHTSNAg",
    thumbUrl: "https://arweave.net/3tfu9NtwHFFrjZdw539J862UwKGc6yBsaL1b7z9sSOg",
  },
  vesper: {
    sourceName: "LadyKoi",
    vrmUrl: "https://arweave.net/t3aTp6AhxfdLcq5I3HZx29wK8MFQGmDC9wPwXrHQoW0",
    thumbUrl: "https://arweave.net/9Whp1HAubA9UjT0Bvq1d-M2QD-XOT_U2tvr3xNqHcME",
  },
  ash: {
    sourceName: "SportTV",
    vrmUrl: "https://arweave.net/ISYr7xBXT_s4tLddbhFB3PpUhWg-H_BYs2UZhVLF1hA",
    thumbUrl: "https://arweave.net/_Qic8KV5P5mo5wJ2N3lbqX0iGVxtVDn4CxCUiM5-Qcg",
  },
  cleo: {
    sourceName: "Psichonaut",
    vrmUrl: "https://arweave.net/k5VyFaeU0FicUnP0NE0FFeVClZfICdEiz1C9-CCNYkk",
    thumbUrl: "https://arweave.net/iebf1Z4z6mOHXeRZC1r7X4hSdmIZoncYqE_Xnbbe8YE",
  },
  luna: {
    sourceName: "Cyberpal",
    vrmUrl: "https://arweave.net/zNTLqtifNdl38MpdNXACcvSMFVu6-s7d6pJQDm7E7Us",
    thumbUrl: "https://arweave.net/5GGzz-zAZinBrKE3qC9-pYoL0ldDo6eYxvlqxJCAGMg",
  },
  juno: {
    sourceName: "Mister",
    vrmUrl: "https://arweave.net/elvlpN6jefoDXqqCWMxCBVZnl6Z2lLD7-wC8N5z1bVk",
    thumbUrl: "https://arweave.net/zFnvDH9ddSiXv4PblERFGatw8Oe7Wq9HRQ7pcIXvMSc",
  },
  elio: {
    sourceName: "AvatarSample C",
    vrmUrl:
      "https://raw.githubusercontent.com/madjin/vrm-samples/master/vroid/stable/AvatarSample_C.vrm",
    thumbUrl: "https://arweave.net/bzT14eOgmZy5k9YW5fa6jBZ1J5Pfrr9OfZ1SSv77T_E",
  },
  hana: {
    sourceName: "Anchor",
    vrmUrl: "https://arweave.net/GhML2d0T_lBZvRA_S28LWVg9wFCWJWqc0cFsVulQQlo",
    thumbUrl: "https://arweave.net/K6A-nGVw0vGNnP11CPJguTkcHRGzuKVCr6dY2K_fW5I",
  },
  priya: {
    sourceName: "Ro",
    vrmUrl: "https://arweave.net/6S5a74z2s5aZrTE71nJR1a1j9x5v46mPy3MKJZMylwg",
    thumbUrl: "https://arweave.net/AanE-OXPp9NMntsz5RggKc4CQ4E_NSBmaZM60XZBbTw",
  },
  cyrus: {
    sourceName: "Udom",
    vrmUrl: "https://arweave.net/VZmDI9KtGRQQziDEURsw0a7cdkbPilVaAnMn3Eck0fg",
    thumbUrl: "https://arweave.net/pOm6lO7LfuIzVItozfPQn6JyZzIMfQOhL-2KSSE5DhQ",
  },
});

export const ROSTER_KEEP_MODEL_NUMBERS = Object.freeze([
  1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 29,
]);
