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

## What we ship today (v460 curated roster — 27 characters)

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
| 8 | yuki | 100Avatars CC0 (Olivia) |
| 9 | hina | 100Avatars CC0 (Lydia) |
| 10 | mio | 100Avatars CC0 (Kate) |
| 11 | amoji | Project original |
| 12 | knight | 100Avatars R3 CC0 |
| 13 | samurai | 100Avatars R3 CC0 |
| 14 | tiger | 100Avatars R3 CC0 |
| 15 | leaf | 100Avatars R3 CC0 |
| 16 | wolf | 100Avatars R3 CC0 |
| 17 | fox | 100Avatars R3 CC0 |
| 18 | jenny | 100Avatars R3 CC0 |
| 19 | weirdcat | 100Avatars R3 CC0 |
| 20 | petal | 100Avatars R3 CC0 |
| 21 | beach | 100Avatars R3 CC0 |
| 22 | pirate | 100Avatars R3 CC0 |
| 23 | bunny | 100Avatars R3 CC0 |
| 24 | sakura | VRoid AvatarSample A · Pro |
| 25 | luna | VRoid fem sample · Pro |
| 26 | celeste | VRoid AvatarSample C · Pro |
| 27 | yume | Curated VRM (Erika lineage) · Pro |

**#5–10** are **VTuber + AAA** slots (legal CC0 / VRoid industry references — not Fab fan rips from inventory Q/S).  
**#24–27** are **VRoid Pro** picks for executive / concierge / creative director vibes.

Legacy saved ids (`sora`, `aria`, `erika`, `rose`, `shiro`, `jennifer`, `poly`, `aesthe`, `chad`, `david`, `hugo`) redirect to current roster entries (often **mei** or Gen3 slots).

## Safe upgrade paths from inventory

Prefer these over Q/S fan rips:

- **VTubeMe Free VRM** (E) — same family as Nova/Sky/Rex
- **100Avatars / CC0** — same family as Yuki/Hina/Mio
- **VRoid Studio → original avatar** (L) — export VRM with clear Hub terms
- **MetaHuman** (A) — photoreal tier; needs Unreal → glTF/VRM pipeline
- **Anime Base Mesh** (A, Fab) — build **original** characters, not IP swaps

Refresh on-disk models:

```bash
node amoji-engine/scripts/download-legal-vrm.mjs
REFRESH_ROSTER_VRM=1 node amoji-engine/scripts/download-legal-vrm.mjs
```

Roster source of truth: `amoji-engine/engine/companion/companionCharacterRoster.js`
