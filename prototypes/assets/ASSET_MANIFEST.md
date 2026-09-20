# Amoji VRM Asset Manifest

## Character picker UI (v380)

| File | Use |
|------|-----|
| `picker-aaa-bg.png` | Full-screen start picker cinematic background |
| `picker-hero-frame.png` | Hero portrait gold frame overlay |
| `picker-roster-plate.png` | Horizontal roster dock glass panel |

Styles: `prototypes/companion-picker-aaa-theme.css`

Legal sources only. **Never** commit models ripped from Replika, Nomi, iBoy, or other commercial apps.  
**Do not ship** Fab/Sketchfab fan rips of FF7, Genshin, Hololive, RE, etc. without explicit IP license.

See also: `amoji-engine/docs/3D_MODEL_INVENTORY.md` (how to read the external model inventory).

## Download test models

```bash
node amoji-engine/scripts/download-legal-vrm.mjs
```

## Curated roster (v328 — 17 characters)

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
| 11 | shiro | `companion-shiro.vrm` | 100Avatars CC0 |
| 12 | jennifer | `companion-jennifer.vrm` | 100Avatars CC0 |
| 13 | poly | `companion-polydancer.vrm` | 100Avatars CC0 |
| 14 | aesthe | `companion-aesthetica.vrm` | 100Avatars CC0 |
| 15 | chad | `companion-chad.vrm` | 100Avatars CC0 |
| 16 | david | `companion-david.vrm` | 100Avatars CC0 |
| 17 | hugo | `companion-hugo.vrm` | 100Avatars CC0 |

Roster source of truth: `amoji-engine/engine/companion/companionCharacterRoster.js`

## Role → characters (v328)

| Role | Characters in app |
|------|-------------------|
| Girlfriend | nova, kizuna, alicia, ember, sky, yuki, hina, mio, amoji, shiro, jennifer, poly, aesthe |
| Boyfriend | rex, chad, david, hugo |
| Secretary (lite UI default) | nova |

## Legacy files (not in v328 picker)

Older CC0 / sample files may remain on disk for reference but are **not** in `ROSTER_CHARACTER_IDS`:  
rose, robert, mimi, chibi, VRoid AvatarSample A/B/C paths, etc.

## Per-file license notes

Each committed VRM should have a matching `*.README.txt` in this folder.

## Inventory platform notes

- **Sketchfab FREE** listings require a **free Sketchfab login** to download — not a broken link.
- **PAID store** rows in the external inventory open Fab/CGTrader/etc. product pages; exact price requires store login.
