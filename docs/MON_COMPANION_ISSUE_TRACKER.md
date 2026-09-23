# Mon — companion problem & request tracker

**Owner:** Mon (Designer)  
**Last updated:** 2026-09-23 21:05 UTC  
**Production build (live):** `2026-09-23-v557-mon-companion-ship` (verified via `/api/health` + `verify:pre-delivery:prod`)  
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

### Verify snapshot — **production `v557`** (merged [#95](https://github.com/MonMonMars/amoji_engine_02/pull/95))

| Gate | Result | Notes |
|------|--------|--------|
| `npm run verify:pre-delivery:prod` | ✅ **4/4** | **57/57** issues E2E on live Vercel |
| `node scripts/demo-link-verify.mjs` | ✅ | Build match + boot/picker/session |
| Companion CI [#95](https://github.com/MonMonMars/amoji_engine_02/pull/95) | ✅ | unit-and-smoke + companion-e2e (incl. CI VRM fetch fallback) |
| `npm run verify:production-build` | ✅ | `/api/health` = `2026-09-23-v557-mon-companion-ship` |

---

## Master problem list (expanded)

### A — Visuals, picker, cache, scenes

| ID | Problem / request | Status | Evidence / fix | PR / build |
|----|-------------------|--------|----------------|------------|
| A1 | Picker / scene / roster **images look stale** (Safari cache) | 🟡 | Cache bust CSS + `/play` 303; v531 | [#77](https://github.com/MonMonMars/amoji_engine_02/pull/77) `v531-visual-cache-fix` |
| A2 | **Black screen** while picker or menu loads | ✅ | Boot picker paint | [#88](https://github.com/MonMonMars/amoji_engine_02/pull/88) merged |
| A3 | **Wide desktop** — Menu blocks picker / layout | ✅ | v550 wide CSS + smoke | [#89](https://github.com/MonMonMars/amoji_engine_02/pull/89), [#90](https://github.com/MonMonMars/amoji_engine_02/pull/90) → **prod ~v551** |
| A4 | **HQ Japanese-style scene backgrounds** not updated | ✅ | `anime-scene-v551-jp-game`, scene-bg regen | **main** `v551-facing-poke-thumbs-anime-bg` on prod |
| A5 | **Roster card PNG ≠ loaded VRM** (wrong pose / back / blended arms on card) | ⏸️ | 31-id regen + suspect gate on **prod v557**; live arm blend on card may still differ (**B1**) | [#95](https://github.com/MonMonMars/amoji_engine_02/pull/95) merged |
| A8 | **Picker hero** — large portrait **+ scene background** preview | ✅ | `picker-hero-preview-duo`; prod E2E `picker-hero-scene-preview` | **prod v557** |
| A6 | **Hero / picker portraits cropped** | ✅ | `object-fit: contain`, picker v4 | [#75](https://github.com/MonMonMars/amoji_engine_02/pull/75), [#89](https://github.com/MonMonMars/amoji_engine_02/pull/89) |
| A7 | **Professional / cinematic scene backgrounds** | ✅ | Pro scene pass | [#71](https://github.com/MonMonMars/amoji_engine_02/pull/71) merged |

### B — 3D body, arms, facing, springs, poke

| ID | Problem / request | Status | Evidence / fix | PR / build |
|----|-------------------|--------|----------------|------------|
| B1 | **Blended / ghost arms** at idle (Nova, Alicia, roster) | ⏸️ | Norm-only writes, planted limb lock, arm bind hints v550 | [#90](https://github.com/MonMonMars/amoji_engine_02/pull/90), [#76](https://github.com/MonMonMars/amoji_engine_02/pull/76), [#72](https://github.com/MonMonMars/amoji_engine_02/pull/72), [#68](https://github.com/MonMonMars/amoji_engine_02/pull/68) |
| B2 | Character **faces backward** on start | ✅ | Portrait facing score + boot refit v550/v551 | **main** v550–v551 |
| B3 | **Double-click / reset camera** → facing wrong again | ✅ | `baseYaw`, reset + forced yaw v551 | **main** `v551` |
| B4 | **Poke / multi-tap → blended head** | ✅ | Torso-only poke shake v551 | **main** `v551` |
| B5 | **Hair / skirt / ribbon** wind, shake, gravity wrong | ⏸️ | v557 spring pre-update pass shipped; Mon may still want [#81](https://github.com/MonMonMars/amoji_engine_02/pull/81) drag tweaks | **prod v557** + #81 |
| B6 | **Skirt weights sliding** / soft parts | ⏸️ | Spring + planted limbs (AGENTS.md regression notes) | v550+ on main; verify in session |
| B7 | **Feet planted** / ghost limbs after `vrm.update` | ⏸️ | Full humanoid norm→raw sync | **main** v550+; E2E `feet-planted` |

### C — Camera & input

| ID | Problem / request | Status | Evidence / fix | PR / build |
|----|-------------------|--------|----------------|------------|
| C1 | **Two-finger pinch zoom** on character (iOS) | ✅ | Orbit `TWO: DOLLY_PAN`; poke defers on 2nd finger | **prod v557** ([#95](https://github.com/MonMonMars/amoji_engine_02/pull/95)) |
| C2 | **Two-finger scroll / trackpad** zoom on character | ✅ | `bindOrbitWheelZoom` on orbit-hit | **prod v557** |
| C3 | One-finger **drag to orbit** on mobile | ⏸️ | Touch ONE rotate removed so pinch works; empty-area drag may need follow-up | [#69](https://github.com/MonMonMars/amoji_engine_02/pull/69) |
| C4 | **Wide browser ghost Menu** over stage | 🟡 | z-index / wide layout | [#74](https://github.com/MonMonMars/amoji_engine_02/pull/74) |

### D — Voice, TTS, lip sync, emotion

| ID | Problem / request | Status | Evidence / fix | PR / build |
|----|-------------------|--------|----------------|------------|
| D1 | **No lip sync** — mouth idle while speaking | 🟡 | Cloud analyser + lip timeline | [#78](https://github.com/MonMonMars/amoji_engine_02/pull/78), [#79](https://github.com/MonMonMars/amoji_engine_02/pull/79) |
| D2 | **No emotion on face/voice** during TTS | 🟡 | Expression timeline + prosody | [#79](https://github.com/MonMonMars/amoji_engine_02/pull/79) |
| D3 | **TTS stops after first few words** (sentence cut off) | ✅ | Mic echo barge during pause; stream session timing | **prod v557** |
| D4 | **Speaker volume jump** when TTS starts | ✅ | `applyTtsPlaybackGain` + GainNode before analyser hookup | **prod v557** |
| D5 | **Talking speed label** should show **1×** for current pace | 🟡 | Talk speed cycle default | [#80](https://github.com/MonMonMars/amoji_engine_02/pull/80) |
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
| F1 | **Kizuna / roster #2** model load fail | 🟡 | Fetch path / HD VRM | [#70](https://github.com/MonMonMars/amoji_engine_02/pull/70) |
| F2 | Replace roster slots (R3 CC0), keep Elio/Yara/Cleo | 🟡 | **Shino** #24 (CC0); **Elio** mesh → VRoid **AvatarSample C** (fixes broken 3D + card) | [#95](https://github.com/MonMonMars/amoji_engine_02/pull/95) **`v557`** |
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

## One-line summary for Mon (2026-09-23 PM)

**On live Vercel today (~v551):** facing reset, poke without head blend, anime scenes, wide picker fixes, free LLM — **✅**. **Still not on prod until merge:** TTS cutting off ([#91](https://github.com/MonMonMars/amoji_engine_02/pull/91)), slow starter chips ([#92](https://github.com/MonMonMars/amoji_engine_02/pull/92)), two-finger zoom ([#69](https://github.com/MonMonMars/amoji_engine_02/pull/69)), lip sync / emotion / talk-speed / hair calm ([#77](https://github.com/MonMonMars/amoji_engine_02/pull/77)–[#81](https://github.com/MonMonMars/amoji_engine_02/pull/81)). **Arms + thumbnail pose on cards:** improved but **⏸️** — say if a specific character still wrong after cache-bust `/play`.

---

## Agent checklist (every fix)

1. Read this file; pick row IDs you touch.  
2. Implement + `npm run verify:pre-delivery`.  
3. Merge → wait deploy → `npm run verify:pre-delivery:prod`.  
4. Update table: 🟡 → ✅ only when prod build matches and Mon’s symptom is covered.  
5. Add a line to **Mon request log** if new wording from Mon.
