# Handoff — Amoji companion (Mon)

**Packed:** 2026-09-26 (commit `eeec98a`)  
**Full repo zip (~1.5 GB, includes `.git`, excludes `node_modules`):**  
`/workspace/amoji_engine_02-handoff-full.zip`  
**Branch:** `cursor/mon-juno-bg-picker-54db` (remote in sync)  
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

- PR **#112** — **CI green** on `328e1b0` (unit-and-smoke + companion-e2e). PR marked **ready for review** (not draft).
- **Production** still **v589** until **#112** merges to `main` + Vercel deploy (~1 min). Then: `npm run verify:pre-delivery:prod`.
- **Merge step:** GitHub → merge PR **#112** → wait for Vercel → confirm `/api/health` build = `2026-09-25-v595-mon-kizuna-begin-cap`.

## Recent user reports (queue)

- **Character #2 (Kizuna)** — “cannot load” on **production v589**; fixes are in this branch (**v595** cap + picker E2E). **Merge #112** then retest on device.
- **B1/B5/B6** — T-pose / spring wind on prod until v595 bundle deploys.

## Unzip & run

```bash
unzip amoji_engine_02-handoff-full.zip -d amoji_engine_02
cd amoji_engine_02
git checkout cursor/mon-juno-bg-picker-54db
npm install && cd amoji-engine && npm install && cd ..
npm run verify:pre-delivery
```

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
