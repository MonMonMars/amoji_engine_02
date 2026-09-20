# Amoji VRM Asset Manifest

## Title screen (v383)

| File | Use |
|------|-----|
| `title-screen-anime-bg.png` | Anime game title / boot splash background |

Styles: `prototypes/companion-title-screen.css`

## Character picker UI (v380)

| File | Use |
|------|-----|
| `picker-aaa-bg.png` | Full-screen start picker cinematic background (v391 HQ anime) |
| `companion-bg-anime.png` | Default / night-city stage & swatch art (HQ anime) |
| `scene-bg/*.png` | Per-preset 1920×1080 anime backgrounds (22 scenes, v407) |
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

## Curated roster (v401 — 23 characters)

On-disk VRMs are **`companion-<characterId>.vrm`** (matches picker id — e.g. `companion-sakura.vrm`).

Refresh after license/source updates:

```bash
REFRESH_ROSTER_VRM=1 node amoji-engine/scripts/download-legal-vrm.mjs
```

See `amoji-engine/docs/3D_MODEL_INVENTORY.md` for sources.

Roster source of truth: `amoji-engine/engine/companion/companionCharacterRoster.js`

## Retired VRM files (removed from deploy)

These basenames are **deleted** on install/CI (`download-legal-vrm.mjs` prune step).  
Legacy ids redirect in app code (e.g. `shiro` → **nana** uses `companion-chibi.vrm`, `chad` → **robert** uses `companion-robert.vrm`):

- `companion-chad.vrm`, `companion-david.vrm`, `companion-hugo.vrm`, `companion-shiro.vrm`
- `companion-avatarsample-c.vrm` (yume uses `companion-erika.vrm`)

Deep links must use `?character=<id>` only — `vrm` / `model3d` URL params are stripped at boot.

## Per-file license notes

Each committed VRM should have a matching `*.README.txt` in this folder.

## Inventory platform notes

- **Sketchfab FREE** listings require a **free Sketchfab login** to download — not a broken link.
- **PAID store** rows in the external inventory open Fab/CGTrader/etc. product pages; exact price requires store login.
