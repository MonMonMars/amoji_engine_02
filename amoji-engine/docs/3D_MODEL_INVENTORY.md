# 3D Model Inventory — how to read it

Reference for the external **3D Model Inventory** spreadsheet/PDF (QQ section labels: PICK, Q, S, A–R).

## Column meanings

| Column | Meaning |
|--------|---------|
| **Sec** | Category bucket (see below) |
| **Model** | Display name / IP note |
| **Host** | Store platform (Fab, RigModels, CGTrader, Sketchfab, VTubeMe, VRoid, Unreal, …) |
| **Price** | **Listing-level** hint — not always the logged-in download price |
| **DL** | `YES` = direct download without store checkout; `store` = open product page |
| **Tris / DLs** | Mesh stats / popularity when known |

## Platform behavior (important)

### Sketchfab — “FREE” on cards

Cards marked **FREE** on Sketchfab are **not dead links**. Sketchfab requires a **free account login** before download — that is normal platform behavior. Treat as **free-with-account**, not broken.

### Store cards — “PAID (some free)” / “PAID (mostly)”

Roughly **~52 PAID store rows** link to **legitimate product pages** on Fab, CGTrader, TurboSquid, etc. Each page shows its own **price / free** button after login. The inventory **does not embed exact USD prices** because:

- Prices change and vary by sale / regional login
- Many Fab listings are “free tier” or educational only
- A human or scripted store pass is needed for exact numbers

**We do not need exact prices** for Amoji shipping decisions unless buying a specific asset — prioritize rows with clear **FREE**, **CC0**, **official**, or **YES** direct download first.

### Direct download (`DL = YES`)

Examples: MetaHuman (Unreal), Mixamo, some Unreal free packs, VTubeMe free VRMs, ITHappy animals. These are the fastest to evaluate in-engine.

## Section guide for Amoji

| Sec | Content | Ship in Amoji? |
|-----|---------|----------------|
| **PICK** | Short list of top candidates | Case-by-case; check license |
| **Q** | AAA **game fan rigs** (FF7, RE, Genshin, etc.) | **No** for production — IP / Fab rip risk |
| **S** | VTuber, anime, Genshin, Miku, Hololive | **No** unless original or licensed |
| **A–E** | Bases, realistic faces, VRM/VRChat, chibi | **Yes** if license allows commercial use |
| **F–R** | Fantasy, pets, tools, Mixamo, VRoid | Motions/tools yes; characters case-by-case |

## What we ship today (v363 curated roster — 23 characters)

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

**#5–10** are **VTuber + AAA** slots (legal CC0 / VRoid industry references — not Fab fan rips from inventory Q/S).

Retired roster ids (`sakura`, `celeste`, `luna`, `yume`) and legacy saved ids (`sora`, `aria`, `erika`, `rose`, `shiro`, `jennifer`, `poly`, `aesthe`, `chad`, `david`, `hugo`) redirect to current roster entries (often **mei** or Gen3 slots).

## Safe upgrade paths from inventory

Prefer these over Q/S fan rips:

- **VTubeMe Free VRM** (E) — same family as Nova/Sky/Rex
- **100Avatars / CC0** — same family as Yuki/Hina/Mio
- **VRoid Studio → original avatar** (L) — export VRM with clear Hub terms
- **MetaHuman** (A) — photoreal tier; needs Unreal → glTF/VRM pipeline
- **Anime Base Mesh** (A, Fab) — build **original** characters, not IP swaps
- **Mixamo** (R) — animation only

## When to pull exact store prices

Only when:

1. You are **purchasing** a specific model for production, or
2. You need to compare two **paid** bases with similar tris/rig quality

Otherwise use **FREE / CC0 / official / YES** rows first.
