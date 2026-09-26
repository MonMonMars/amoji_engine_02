# Handoff — Amoji companion (Mon)

**Packed:** 2026-09-26  
**Full repo zip (1.5 GB, includes `.git`, excludes `node_modules`):**  
`/workspace/amoji_engine_02-handoff-2026-09-26.zip` (same file at `/tmp/amoji_engine_02-handoff-2026-09-26.zip`)  
**Branch:** `cursor/mon-juno-bg-picker-54db`  
**Repo build:** `2026-09-25-v595-mon-kizuna-begin-cap` (`amoji-engine/engine/companion/buildVersion.mjs`)

## Start here

1. Read `AGENTS.md` and `docs/MON_COMPANION_ISSUE_TRACKER.md`.
2. Install: `npm install` (root) and `cd amoji-engine && npm install` if needed; `npm run postinstall` for VRM assets if missing.
3. Verify locally: `npm run verify:pre-delivery` (must be **5/5** before sharing demo links).
4. Production base: https://temporary-rushing-oxygen-ok5jzhd.vercel.app — bookmark `/play`.

## Open PR (primary ship target)

- **#112** https://github.com/MonMonMars/amoji_engine_02/pull/112  
  Bundle: Juno (#26 male voice), v594 anime scene backgrounds, pro picker UI, idle forearm/spring fixes (v593), switch E2E locale fixes, **Kizuna #2 begin cap** (v595 — `ensureModelReady` no longer blocks session start on slow VRM download).

## CI / deploy

- PR **#112** CI was green on commit `159faf6`; later commits add v595 Kizuna cap + tracker — re-run CI after pull.
- **Production** was still on **v589** until merge to `main` + Vercel deploy. After merge: `npm run verify:pre-delivery:prod`.

## Recent user reports (queue)

- **Character #2 (Kizuna)** — “cannot load” on device; fix: capped prefetch wait in `companionStartPickerPreload.js` before `startSession`.
- **B1/B5/B6** — T-pose / spring wind on prod until v595 bundle deploys.

## Superseded / check before merge

- **#111** (`cursor/fix-idle-tpose-springs-54db`) — largely contained in #112 branch; may close as duplicate.
- **#110** switch identity — also merged into #112 history.

## Key paths

| Area | Files |
|------|--------|
| Build id | `amoji-engine/engine/companion/buildVersion.mjs` |
| Kizuna begin | `amoji-engine/engine/companion/companionStartPickerPreload.js` |
| Picker layout | `prototypes/companion-picker-pro-ui.css` |
| Issues E2E | `scripts/companion-issues-verify.mjs` |
| Tracker | `docs/MON_COMPANION_ISSUE_TRACKER.md` |

## Git remote

- Origin: `MonMonMars/amoji_engine_02`
- Push: `git push -u origin cursor/mon-juno-bg-picker-54db`
