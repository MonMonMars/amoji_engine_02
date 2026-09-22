# 3D model inventory (companion roster)

External research lives in spreadsheets / Fab; this doc is **what Amoji ships** in the picker.

## License tiers (quick read)

| Tier | Meaning | Ship in Amoji? |
|------|---------|----------------|
| **PICK** | Short list of top candidates | Case-by-case; check license |
| **Q** | AAA **game fan rigs** (FF7, RE, Genshin, etc.) | **No** for production — IP / Fab rip risk |
| **S** | VTuber, anime, Genshin, Miku, Hololive | **No** unless original or licensed |
| **A–E** | Bases, realistic faces, VRM/VRChat, chibi | **Yes** if license allows commercial use |
| **F–R** | Fantasy, pets, tools, Mixamo, VRoid | Motions/tools yes; characters case-by-case |

## What we ship today (v519 — 31 characters)

In the app: **start picker** horizontal strip or **Menu → Switch 3D companion**.  
Settings **Brain → LLM model** is the **text AI**, not these 3D files.

| # | ID | 3D model source |
|---|-----|-----------------|
| 1 | nova | VTubeMe photoreal VRM |
| 2 | kizuna | Kizuna AI official VRM |
| 3 | alicia | Alicia Solid / UniVRM |
| 4 | ember | VTubeMe expressive VRM |
| 5 | mei | VRoid AvatarSample B · AAA |
| 6 | atlas | VRoid Pro male |
| 7 | sky | VTubeMe CC BY 4.0 |
| 8 | yuki | 100Avatars CC0 |
| 9 | hina | 100Avatars CC0 |
| 10 | mio | 100Avatars CC0 |
| 11 | amoji | Pixiv VRM 1.0 sample (project mascot) |
| 12–23 | orion…cleo | Curated CC0 / Arweave lineup (see `companionRosterReplacementData.mjs`) |
| 24 | sienna | VRoid AvatarSample A · Pro |
| 25 | luna | VRoid fem sample · Pro |
| 26–31 | juno…cyrus | Unique CC0 / Arweave Pro picks (no shared AvatarSample C clones) |

Legacy saved ids (`knight`, `sakura`, `fox`, etc.) redirect to current roster entries — see `companionLegacyRosterIds.js`.

## Safe upgrade paths from inventory

Prefer these over Q/S fan rips:

- **VTubeMe Free VRM** (E) — same family as Nova/Sky
- **100Avatars / CC0** — same family as Yuki/Hina/Mio
- **VRoid Studio → original avatar** (L) — export VRM with clear Hub terms

Refresh on-disk models:

```bash
node amoji-engine/scripts/download-legal-vrm.mjs
REFRESH_ROSTER_VRM=1 node amoji-engine/scripts/download-legal-vrm.mjs
```

Roster source of truth: `amoji-engine/engine/companion/companionCharacterRoster.js`  
Model cache bust: `AMOJI_MODEL_REVISION` in `companionCharacterMigration.mjs`.
