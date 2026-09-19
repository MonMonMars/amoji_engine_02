# Amoji VRM Asset Manifest

Legal sources only. **Never** commit models ripped from Replika, Nomi, iBoy, or other commercial apps.  
**Do not ship** Fab/Sketchfab fan rips of FF7, Genshin, Hololive, RE, etc. without explicit IP license.

See also: `amoji-engine/docs/3D_MODEL_INVENTORY.md` (how to read the external model inventory).

## Download test models

```bash
node amoji-engine/scripts/download-legal-vrm.mjs
```

## Curated roster (v298 — 10 characters)

| # | ID | VRM file | License |
|---|-----|----------|---------|
| 1 | nova | `companion-nova.vrm` | VTubeMe CC BY 4.0 |
| 2 | kizuna | `kizuna-kamatte.vrm` | Kizuna AI official |
| 3 | alicia | `companion-alicia.vrm` | Alicia Solid / UniVRM |
| 4 | ember | `companion-ember.vrm` | VTubeMe CC BY 4.0 |
| 5 | sky | `companion-sky.vrm` | VTubeMe CC BY 4.0 |
| 6 | yuki | `companion-olivia.vrm` | 100Avatars CC0 |
| 7 | hina | `companion-lydia.vrm` | 100Avatars CC0 |
| 8 | mio | `companion-kate.vrm` | 100Avatars CC0 |
| 9 | amoji | `companion-girl.vrm` | Project original |
| 10 | rex | `companion-kai.vrm` | VTubeMe CC BY 4.0 |

Roster source of truth: `amoji-engine/engine/companion/companionCharacterRoster.js`

## Role → characters (v298)

| Role | Characters in app |
|------|-------------------|
| Girlfriend | nova, kizuna, alicia, ember, sky, yuki, hina, mio, amoji |
| Boyfriend | rex |
| Secretary (lite UI default) | nova |

## Legacy files (not in v298 picker)

Older CC0 / sample files may remain on disk for reference but are **not** in `ROSTER_CHARACTER_IDS`:  
chad, david, hugo, rose, robert, mimi, chibi, VRoid AvatarSample A/B/C paths, etc.

## Per-file license notes

Each committed VRM should have a matching `*.README.txt` in this folder.

## Inventory platform notes

- **Sketchfab FREE** listings require a **free Sketchfab login** to download — not a broken link.
- **PAID store** rows in the external inventory open Fab/CGTrader/etc. product pages; exact price requires store login.
