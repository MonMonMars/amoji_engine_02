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

## What we ship today (v360 curated roster — 23 characters)

In the app: **start picker** horizontal strip or **Menu → Switch 3D companion**.  
Settings **Brain → LLM model** is the **text AI**, not these 3D files.

| # | ID | 3D model source |
|---|-----|-----------------|
| 1 | nova | VTubeMe photoreal VRM |
| 2 | kizuna | Kizuna AI official VRM |
| 3 | alicia | Alicia Solid / UniVRM |
| 4 | ember | VTubeMe expressive VRM |
| 5 | sora | VRoid AvatarSample C |
| 6 | aria | VRoid AvatarSample A |
| 7 | mei | VRoid AvatarSample B |
| 8 | luna | VRoid Pro female |
| 9 | atlas | VRoid Pro male |
| 10 | erika | Industry VRM |
| 11 | sky | VTubeMe CC BY 4.0 |
| 12 | yuki | 100Avatars CC0 (Olivia) |
| 13 | hina | 100Avatars CC0 (Lydia) |
| 14 | mio | 100Avatars CC0 (Kate) |
| 15 | amoji | Project original |
| 16 | rex | VTubeMe Kai |
| 17 | shiro | 100Avatars CC0 |
| 18 | jennifer | 100Avatars CC0 |
| 19 | poly | 100Avatars CC0 Polydancer |
| 20 | aesthe | 100Avatars CC0 Aesthetica |
| 21 | chad | 100Avatars CC0 |
| 22 | david | 100Avatars CC0 |
| 23 | hugo | 100Avatars CC0 |

**#5–10** are the **AAA VRoid catalog** slots (legal industry references — not Fab fan rips from inventory Q/S).

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
