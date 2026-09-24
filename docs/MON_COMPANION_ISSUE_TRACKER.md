# Mon — companion problem & request tracker

**Owner:** Mon (Designer)  
**Last updated:** 2026-09-24 02:45 UTC  
**Production build (live):** `2026-09-24-v563-mon-orbit-zoom-rotate` — **repo** `2026-09-24-v565-mon-body-front-facing` (deploy pending)  
**Repo `main` build:** `amoji-engine/engine/companion/buildVersion.mjs` → `AMOJI_BUILD`  
**App entry (bookmark):** https://temporary-rushing-oxygen-ok5jzhd.vercel.app/play  

Agents: **read this before saying “fixed.”** Update a row when status changes (merge + prod verify, or new user report).

---

## Status key

| Symbol | Meaning |
|--------|---------|
| ✅ | **Solved on production** — merged to `main`, Vercel deployed, `node scripts/demo-link-verify.mjs` exit **0** (build match) |
| 🟡 | **Coded, deploy pending** — fix on `main` or open PR; production build **behind** or not merged |
| 🔴 | **Not solved** — no merged fix, or Mon still sees it after prod caught up |
| ⏸️ | **Partial** — better but not done; or only fixed in one locale/character |
| 📋 | **Docs / planning only** — no runtime fix expected |

---

## Production vs repo (check first)

| Check | Command / signal |
|-------|------------------|
| Live build id | `curl -s …/api/health \| jq .build` |
| Repo build id | `AMOJI_BUILD` in `buildVersion.mjs` |
| Full gate (prod) | `npm run verify:pre-delivery:prod` |
| Mon’s reported issues E2E | `node scripts/companion-issues-verify.mjs` (in pre-delivery) |

**If live build ≠ repo build:** tell Mon **deploy pending** — do not claim production is updated.

**iOS:** bookmark **`/play` only** (not `/companion-full`).

### Verify snapshot — **production `v562`** (merged [#100](https://github.com/MonMonMars/amoji_engine_02/pull/100))

| Gate | Result | Notes |
|------|--------|--------|
| `npm run verify:pre-delivery:prod` | ✅ **4/4** | **57/57** issues E2E; build match **v562** |
| Roster PNG regen | ✅ | 31 card + 31 hero after facing fix |

### Verify snapshot — **production `v561`** (merged [#99](https://github.com/MonMonMars/amoji_engine_02/pull/99))

| Gate | Result | Notes |
|------|--------|--------|
| `npm run verify:pre-delivery:prod` | ✅ **4/4** | **57/57** issues E2E; build match **v561** |
| `/api/health` `build` | ✅ | `2026-09-23-v561-mon-vtuber-model-cache` |
| Companion CI [#99](https://github.com/MonMonMars/amoji_engine_02/pull/99) | ✅ | unit-and-smoke + companion-e2e |

### Verify snapshot — **production `v560`** (merged [#98](https://github.com/MonMonMars/amoji_engine_02/pull/98))

| Gate | Result | Notes |
|------|--------|--------|
| `npm run verify:pre-delivery:prod` | ✅ **4/4** | **57/57** issues E2E on live Vercel |
| `node scripts/demo-link-verify.mjs` | ✅ | Build match + boot/picker/session |
| Companion CI [#98](https://github.com/MonMonMars/amoji_engine_02/pull/98) | ✅ | unit-and-smoke + companion-e2e |
| Prior ships [#97](https://github.com/MonMonMars/amoji_engine_02/pull/97)–[#95](https://github.com/MonMonMars/amoji_engine_02/pull/95) | ✅ | v559 cache/springs; v558 voice UI; v557 roster |

---

## Master problem list (expanded)

### A — Visuals, picker, cache, scenes

| ID | Problem / request | Status | Evidence / fix | PR / build |
|----|-------------------|--------|----------------|------------|
| A1 | Picker / scene / roster **images look stale** (Safari cache) | ⏸️ | `picker-anime-v559-wave3` + roster `?v=` bump; early boot PNG+SVG; bookmark **`/play`** | **prod v559** ([#97](https://github.com/MonMonMars/amoji_engine_02/pull/97)) |
| A2 | **Black screen** while picker or menu loads | ✅ | Boot picker paint | [#88](https://github.com/MonMonMars/amoji_engine_02/pull/88) merged |
| A3 | **Wide desktop** — Menu blocks picker / layout | ✅ | v550 wide CSS + smoke | [#89](https://github.com/MonMonMars/amoji_engine_02/pull/89), [#90](https://github.com/MonMonMars/amoji_engine_02/pull/90) → **prod ~v551** |
| A4 | **HQ Japanese-style scene backgrounds** not updated | ✅ | `anime-scene-v551-jp-game`, scene-bg regen | **main** `v551-facing-poke-thumbs-anime-bg` on prod |
| A5 | **Roster card PNG ≠ loaded VRM** (wrong pose / back / blended arms on card) | ⏸️ | **v565:** torso must face camera (was head-only `facingCamera`); contrast yaw/z pick + regen — **Alicia/Ember/Mei OK**; **Yuki/Kizuna still back/broken** on desktop QA | **v565** PR |
| A8 | **Picker hero** — large portrait **+ scene background** preview | ✅ | `picker-hero-preview-duo`; prod E2E `picker-hero-scene-preview` | **prod v557** |
| A6 | **Hero / picker portraits cropped** | ✅ | `object-fit: contain`, picker v4 | [#75](https://github.com/MonMonMars/amoji_engine_02/pull/75), [#89](https://github.com/MonMonMars/amoji_engine_02/pull/89) |
| A7 | **Professional / cinematic scene backgrounds** | ✅ | Pro scene pass | [#71](https://github.com/MonMonMars/amoji_engine_02/pull/71) merged |

### B — 3D body, arms, facing, springs, poke

| ID | Problem / request | Status | Evidence / fix | PR / build |
|----|-------------------|--------|----------------|------------|
| B1 | **Blended / ghost arms** at idle (Nova, Alicia, roster) | ⏸️ | **v562** idle **neck rest** + planted lock v11; forearms v560 | re-report if arms still ghost |
| B2 | Character **faces backward** on start | ⏸️ | Session **front** on Nova/Shino after v563; **picker strip** still wrong on several ids (**A5**) | [#100](https://github.com/MonMonMars/amoji_engine_02/pull/100) + **v565** |
| B3 | **Double-click / reset camera** → facing wrong again | ✅ | `baseYaw`, reset + forced yaw v551 | **main** `v551` |
| B4 | **Poke / multi-tap → blended head** | ✅ | Torso-only poke shake v551 | **main** `v551` |
| B5 | **Hair / skirt / ribbon** wind, shake, gravity wrong | ⏸️ | Spring **v15** world-down gravity + stronger skirt/hair pull on **prod v559** | [#97](https://github.com/MonMonMars/amoji_engine_02/pull/97) |
| B6 | **Skirt weights sliding** / soft parts | ⏸️ | Spring + planted limbs (AGENTS.md regression notes) | v550+ on main; verify in session |
| B7 | **Feet planted** / ghost limbs after `vrm.update` | ⏸️ | Full humanoid norm→raw sync | **main** v550+; E2E `feet-planted` |

### C — Camera & input

| ID | Problem / request | Status | Evidence / fix | PR / build |
|----|-------------------|--------|----------------|------------|
| C1 | **Two-finger pinch zoom** on character (iOS) | ✅ | Orbit `TWO: DOLLY_PAN`; poke defers on 2nd finger | **prod v557** ([#95](https://github.com/MonMonMars/amoji_engine_02/pull/95)) |
| C2 | **Two-finger scroll / trackpad** zoom on character | ✅ | **Desktop prod v563:** wheel changes stage pixels; v563 removed stopPropagation | [#101](https://github.com/MonMonMars/amoji_engine_02/pull/101) |
| C3 | One-finger **drag to orbit** on mobile | ✅ | **v563** `TOUCH.ONE` rotate + wheel zoom fix (no stopPropagation) | [#101](https://github.com/MonMonMars/amoji_engine_02/pull/101) prod **v563** |
| C4 | **Wide browser ghost Menu** over stage | ✅ | `.settings:not([hidden])` on wide desktop inline CSS + `companion-app-width.css` | **prod v558** ([#96](https://github.com/MonMonMars/amoji_engine_02/pull/96)) |

### D — Voice, TTS, lip sync, emotion

| ID | Problem / request | Status | Evidence / fix | PR / build |
|----|-------------------|--------|----------------|------------|
| D1 | **No lip sync** — mouth idle while speaking | ⏸️ | Face/lip timers decoupled; cloud `beginMouth` on metadata/canplay; E2E `mouth-moves-when-talking` pass | **prod v558** — re-report if still idle in session |
| D2 | **No emotion on face/voice** during TTS | ⏸️ | Expression snap without speech unit; vocal `snapStrength` on **prod v560** | [#98](https://github.com/MonMonMars/amoji_engine_02/pull/98) |
| D3 | **TTS stops after first few words** (sentence cut off) | ✅ | Mic echo barge during pause; stream session timing | **prod v557** |
| D4 | **Speaker volume jump** when TTS starts | ✅ | `applyTtsPlaybackGain` + GainNode before analyser hookup | **prod v557** |
| D5 | **Talking speed label** should show **1×** for current pace | ✅ | Talk speed v4 — 0.42 internal = **1× Normal** | **prod v558** ([#96](https://github.com/MonMonMars/amoji_engine_02/pull/96)) |
| D6 | **ChatGPT-style emotional voice** (prosody / instruct) | ⏸️ | Cloud TTS + demo page | [#62](https://github.com/MonMonMars/amoji_engine_02/pull/62), #79 |
| D7 | **Starter chip “thinking” too long** — preload Q+A | ✅ | Instant starter replies + TTS prefetch | **prod v557** |

### E — Chat, LLM, UX

| ID | Problem / request | Status | Evidence / fix | PR / build |
|----|-------------------|--------|----------------|------------|
| E1 | **Free / smart online LLM** (OpenRouter) | ✅ | `/api/llm/status`, hosted chain | [#86](https://github.com/MonMonMars/amoji_engine_02/pull/86) merged |
| E2 | **Fix all problems** ship together | ⏸️ | v550 bundle merged; follow-ups v551 + open PRs | [#90](https://github.com/MonMonMars/amoji_engine_02/pull/90), #91–#92, #69, #77–#81 |
| E3 | **Mini emotion ball / mic UI** polish | 🟡 | | [#67](https://github.com/MonMonMars/amoji_engine_02/pull/67) |
| E4 | **iOS app never updates** (cache) | ⏸️ | `/play` fresh path + Clear-Site-Data | [#63](https://github.com/MonMonMars/amoji_engine_02/pull/63) + main `/play` |

### F — Roster & models

| ID | Problem / request | Status | Evidence / fix | PR / build |
|----|-------------------|--------|----------------|------------|
| F1 | **Kizuna / roster #2** model load fail | ✅ | `companion-kizuna.vrm` on prod; `verify:roster-models` 8/8 incl. kizuna | **prod v558** |
| F2 | Replace roster slots (R3 CC0), keep Elio/Yara/Cleo | ✅ | Preload cache keyed by `?v=` revision + **`v561`** roster bust (fixes stale VTuber mesh in RAM) | [#99](https://github.com/MonMonMars/amoji_engine_02/pull/99) prod **v561** |
| F4 | **Elio** 3D / card looked like flat color blocks | ✅ | AvatarSample C + `vrmModelBounds` + preview regen | **prod v557** |
| F3 | Unique VRM per character id (no shared mesh) | ⏸️ | `rosterVrmUniqueness.test.js` allowed dup groups | ongoing |

### G — Docs / business

| ID | Problem / request | Status | Evidence / fix | PR / build |
|----|-------------------|--------|----------------|------------|
| G1 | **B2B + B2C business plan** | 📋 | | [#87](https://github.com/MonMonMars/amoji_engine_02/pull/87) |
| G2 | **This tracker** — expand list, mark solved/not | 🟡 | Updated with v557 verify snapshot + F4/A8 | [#82](https://github.com/MonMonMars/amoji_engine_02/pull/82), **#95** |

---

## Mon request log (chronological, expanded)

Use this to see **what was asked** vs **what shipped**.

| When | Mon said (paraphrase) | Tracker IDs | Outcome |
|------|------------------------|-------------|---------|
| Weeks | Visuals don’t update, lip sync, emotion, arms | A1, D1–D2, B1 | Many open PRs #77–#81 |
| 2026-09-23 AM | Wide desktop + picker; HQ backgrounds; thumbs | A3–A6 | ✅ #90 / **prod v551** |
| 2026-09-23 AM | **Problem chart** — what’s fixed vs not | G2 | This doc |
| 2026-09-23 AM | **Arms blend** — fix first | B1 | ⏸️ v550; Mon still reported after → more PRs |
| 2026-09-23 AM | **Facing backward** — fix first | B2 | ✅ v550/v551 prod |
| 2026-09-23 AM | **Fix all** ship together | E2 | #90 merged; not all rows ✅ |
| 2026-09-23 AM | Free LLM still works? | E1 | ✅ |
| 2026-09-23 AM | **Same problems again** — arms, head blend, thumbs, backgrounds; facing OK then **backward on double-click** | B1, B3–B5, A4–A5 | v551 on **prod** for B3–B4, A4; B1/A5 ⏸️ |
| 2026-09-23 PM | **TTS cuts off** first few words | D3 | 🟡 [#91](https://github.com/MonMonMars/amoji_engine_02/pull/91) |
| 2026-09-23 PM | **Talking loading too long** — preload starter Q+A | D7 | 🟡 [#92](https://github.com/MonMonMars/amoji_engine_02/pull/92) |
| 2026-09-23 PM | **Two-finger scroll** on character → zoom | C1–C2 | 🟡 [#69](https://github.com/MonMonMars/amoji_engine_02/pull/69) |
| 2026-09-23 PM | **Keep expanding problem list + solved/not** | G2 | 🟡 this update |
| 2026-09-23 PM | **Continue check for errors + update chart** | A5, A8, F4 | Elio VRM + preview QA; **57/57** local E2E on **v557** |
| 2026-09-23 PM | **Next** — ship to production | #95 → main | **Merged**; prod **`verify:pre-delivery:prod` 4/4** |
| 2026-09-23 PM | **Continue** — wave 2 (speed, lip/emotion, wide menu ghost) | D1–D2, D5, C4 | **Merged [#96](https://github.com/MonMonMars/amoji_engine_02/pull/96)**; prod **`verify:pre-delivery:prod` 4/4** |
| 2026-09-23 PM | **Next / Continue** — waves 3–4 (cache, springs, arms, face snap) | A1, B5, B1, D2 | **Merged [#97](https://github.com/MonMonMars/amoji_engine_02/pull/97)–[#98](https://github.com/MonMonMars/amoji_engine_02/pull/98)**; prod **v560** |

---

## Open PR queue (merge priority suggestion)

1. **D1–D2, D5** [#79](https://github.com/MonMonMars/amoji_engine_02/pull/79), [#80](https://github.com/MonMonMars/amoji_engine_02/pull/80) lip/emotion/speed  
3. **A1** [#77](https://github.com/MonMonMars/amoji_engine_02/pull/77) visual cache  
4. **B1** [#76](https://github.com/MonMonMars/amoji_engine_02/pull/76) arms (if still failing after prod)  
5. **F1, C4** [#70](https://github.com/MonMonMars/amoji_engine_02/pull/70), [#74](https://github.com/MonMonMars/amoji_engine_02/pull/74)  

After each merge batch: `npm run verify:pre-delivery:prod` → exit **0** before telling Mon it’s live.

---

## E2E checks map (`companion-issues-verify.mjs`)

| Check name | Related IDs |
|------------|-------------|
| `build-id` | all — prod vs repo |
| `boot-splash-or-picker-visible` | A2 |
| `picker-*` | A3, A6 |
| `feet-planted` | B7 |
| `camera-orbit-drag` | C1 |
| `poke-body-only-while-speaking` | B4 |
| `mouth-moves-when-talking` / ember mouth | D1 |
| `starter-prompts-visible` | D7 |
| `switch-character-model` | F1, A5 |
| `picker-hero-scene-preview` | A8 |
| `roster-preview-no-suspect` | A5, F4 |

---

## Desktop production QA — 2026-09-24 (1440×900 Chrome, build **v563**)

| Check | Result | Evidence |
|-------|--------|----------|
| `/api/health` | ✅ **v563** | Automated |
| `verify:pre-delivery:prod` | ✅ **57/57** | Automated |
| Session default facing (Shino) | ✅ **Face to camera** | `/opt/cursor/artifacts/desktop-prod-shino-default-frame.png` |
| Orbit drag / wheel zoom | ✅ Pixel change on `#orbit-hit` | `/opt/cursor/artifacts/desktop-prod-orbit-test.png` |
| Picker roster strip PNGs | 🔴 **Many backs** | `/opt/cursor/artifacts/desktop-prod-picker-wide.png` |
| Idle arms (Shino) | ⏸️ **T-pose / stiff** | Same session shot — **B1** |

**Do not mark A5/B2 ✅ until desktop picker strip is front-facing (see v565 QA below).**

## Desktop local QA — 2026-09-24 (1440×900, build **v565**)

| Check | Result | Evidence |
|-------|--------|----------|
| Root cause | ✅ **Head-only facing bug** | `facingCamera` true while `bodyScore ≈ -1` (Alicia) — fixed in `companionPortraitFraming.js` |
| Alicia / Mei / Ember cards | ✅ Front | e.g. `/opt/cursor/artifacts/desktop-v565-picker-wide.png` (after regen) |
| Yuki / Kizuna cards | 🔴 Back or sideways | Per-id VRM + capture still wrong |
| `verify:pre-delivery` | Run on PR | local gate before merge |

## One-line summary for Mon (2026-09-24)

**Chart was overclaiming ✅ on picker cards.** Desktop QA on prod **v563** showed many **back-facing roster PNGs** while E2E passed. **v565** fixes the logic (`facingCamera` required **torso + head**, Nova photoreal exception, capture yaw/z sweep). **Partial regen improvement** — not all 31 cards yet. **Prod still v563** until merge. **⏸️ B1** arms, **D1/D2** lip/emotion. Bookmark **`/play`**.

---

## Agent checklist (every fix)

1. Read this file; pick row IDs you touch.  
2. Implement + `npm run verify:pre-delivery`.  
3. Merge → wait deploy → `npm run verify:pre-delivery:prod`.  
4. Update table: 🟡 → ✅ only when prod build matches and Mon’s symptom is covered.  
5. Add a line to **Mon request log** if new wording from Mon.
