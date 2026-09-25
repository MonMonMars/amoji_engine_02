# Mon — companion problem & request tracker

**Owner:** Mon (Designer)  
**Last updated:** 2026-09-25 01:36 UTC  
**Production build (live):** check `/api/health` — often **behind** repo until PRs merge  
**Repo `AMOJI_BUILD`:** `2026-09-25-v593-mon-idle-forearm-spring-lock` (`amoji-engine/engine/companion/buildVersion.mjs`)  
**App entry (bookmark):** https://temporary-rushing-oxygen-ok5jzhd.vercel.app/play  

Agents: **read this before saying “fixed.”** Update a row when status changes (merge + prod verify, or new user report).

---

## Status key

| Symbol | Meaning |
|--------|---------|
| ✅ | **Solved on production** — merged to `main`, Vercel deployed, `node scripts/demo-link-verify.mjs` exit **0** (build match) |
| 🟡 | **Coded, deploy pending** — fix on branch/open PR; production build **behind** or not merged |
| 🔴 | **Not solved** — no merged fix, or Mon still sees it after prod caught up |
| ⏸️ | **Partial** — better but not done; or only fixed in one locale/character |
| 📋 | **Docs / planning only** — no runtime fix expected |

---

## Production vs repo (check first)

| Check | Command / signal |
|-------|------------------|
| Live build id | `curl -s …/api/health \| jq .build` |
| Repo build id | `AMOJI_BUILD` in `buildVersion.mjs` |
| Full gate (local) | `npm run verify:pre-delivery` |
| Full gate (prod) | `npm run verify:pre-delivery:prod` |
| Mon’s reported issues E2E | `node scripts/companion-issues-verify.mjs` (in pre-delivery) |

**If live build ≠ repo build:** tell Mon **deploy pending** — do not claim production is updated.

**iOS:** bookmark **`/play` only** (not `/companion-full`).

### Verify snapshot — **repo `v593`** (branch `cursor/fix-idle-tpose-springs-54db`)

| Gate | Result | Notes |
|------|--------|--------|
| Unit tests | ✅ | planted forearm lock + spring stability |
| `npm run verify:pre-delivery` | run before share | idle forearm lock + post-update spring damp |

### Verify snapshot — **production `v563`** (merged [#101](https://github.com/MonMonMars/amoji_engine_02/pull/101))

| Gate | Result | Notes |
|------|--------|--------|
| `npm run verify:pre-delivery:prod` | ✅ (historical) | orbit zoom; build **v563** |
| Mon session report 2026-09-25 | 🔴 | **B1/B5/B6** still visible on live prod |

---

## Master problem list (expanded)

### A — Visuals, picker, cache, scenes

| ID | Problem / request | Status | Evidence / fix | PR / build |
|----|-------------------|--------|----------------|------------|
| A1 | Picker / scene / roster **images look stale** (Safari cache) | 🟡 | Scene swatches + `AMOJI_MODEL_REVISION`; full PNG regen | various |
| A2 | **Black screen** while picker or menu loads | ✅ | Boot picker paint | [#88](https://github.com/MonMonMars/amoji_engine_02/pull/88) |
| A3 | **Wide desktop** — Menu blocks picker / layout | ✅ | v550 wide CSS + smoke | [#89](https://github.com/MonMonMars/amoji_engine_02/pull/89) |
| A4 | **HQ Japanese-style scene backgrounds** | ✅ | `anime-scene-v551-jp-game` | **prod v551** |
| A5 | **Roster card PNG ≠ loaded VRM** (wrong pose / blended arms on card) | 🟡 | Regen + idle presentation; Mon still reports **session** arms ≠ card | **#105**, v582 branch |
| A8 | **Picker hero** — portrait + scene preview | ✅ | `picker-hero-scene-preview` | **prod v557** |
| A6 | **Hero / picker portraits cropped** | ✅ | `object-fit: contain` | [#75](https://github.com/MonMonMars/amoji_engine_02/pull/75) |
| A7 | **Professional / cinematic scene backgrounds** | ✅ | Pro scene pass | [#71](https://github.com/MonMonMars/amoji_engine_02/pull/71) |

### B — 3D body, arms, facing, springs, poke

| ID | Problem / request | Status | Evidence / fix | PR / build |
|----|-------------------|--------|----------------|------------|
| B1 | **Blended / ghost arms** + **T-pose** at idle (live session) | 🟡 | **v593** — lock **forearms** on planted idle (`reapplyPlantedLimbs`, `finishPlantedLimbLockPostUpdate`, frame `enforcePlantedLimbs`, `plantedRestSnap` in `update`) | `cursor/fix-idle-tpose-springs-54db` |
| B2 | Character **faces backward** on start | ✅ | Bind back-view + portrait resolve | [#100](https://github.com/MonMonMars/amoji_engine_02/pull/100) **v562** |
| B3 | **Double-click / reset camera** → facing wrong | ✅ | `baseYaw`, reset portrait | **v551** |
| B4 | **Poke / multi-tap → blended head** | ✅ | Torso-only poke | **v551** |
| B5 | **Hair / skirt / ribbon** — wind **from below**, wrong flutter | 🟡 | **v593** — post-`vrm.update` `enforceSpringGravityDown` + `dampUpwardSpringTailDrift`; v15 guard retained | `cursor/fix-idle-tpose-springs-54db` |
| B6 | **Skirt weights sliding** / soft parts **blend** with body | 🟡 | Full norm→raw sync + forearm lock reduces leg/arm drift; **v593** post-spring damp | same branch |
| B7 | **Feet planted** / ghost limbs after `vrm.update` | 🟡 | Planted lock before/after update; E2E `feet-planted` passes — Mon still reports ghost **arms** (**B1**) | v593 |

### C — Camera & input

| ID | Problem / request | Status | Evidence / fix | PR / build |
|----|-------------------|--------|----------------|------------|
| C1 | **Two-finger pinch zoom** (iOS) | ✅ | Orbit `TWO: DOLLY_PAN` | **v557** |
| C2 | **Two-finger scroll / trackpad** zoom | ✅ | `bindOrbitWheelZoom` | **v557** |
| C3 | One-finger **drag to orbit** on mobile | ✅ | **v563** | [#101](https://github.com/MonMonMars/amoji_engine_02/pull/101) |
| C4 | **Wide browser ghost Menu** | ✅ | **v558** | [#96](https://github.com/MonMonMars/amoji_engine_02/pull/96) |

### D — Voice, TTS, lip sync, emotion

| ID | Problem / request | Status | Evidence / fix | PR / build |
|----|-------------------|--------|----------------|------------|
| D1 | **No lip sync** — mouth idle while speaking | ⏸️ | E2E pass; re-report in session | **v558** |
| D2 | **No emotion on face/voice** during TTS | ⏸️ | Expression snap **v560** | [#98](https://github.com/MonMonMars/amoji_engine_02/pull/98) |
| D3 | **TTS stops after first few words** | ✅ | Mic echo / stream timing | **v557** |
| D4 | **Speaker volume jump** when TTS starts | ✅ | Gain staging | **v557** |
| D5 | **Talking speed label** shows **1×** | ✅ | Talk speed v4 | **v558** |
| D6 | **ChatGPT-style emotional voice** | ⏸️ | Cloud TTS + demo | [#62](https://github.com/MonMonMars/amoji_engine_02/pull/62) |
| D7 | **Starter chip “thinking” too long** | ✅ | Preload Q+A | **v557** |

### E — Chat, LLM, UX

| ID | Problem / request | Status | Evidence / fix | PR / build |
|----|-------------------|--------|----------------|------------|
| E1 | **Free / smart online LLM** (OpenRouter) | ✅ | `/api/llm/status` | [#86](https://github.com/MonMonMars/amoji_engine_02/pull/86) |
| E2 | **Fix all problems** ship together | 🔴 | Mon 2026-09-25: **most body/spring issues still open on prod** | ongoing |
| E3 | **Mini emotion ball / mic UI** polish | 🟡 | | [#67](https://github.com/MonMonMars/amoji_engine_02/pull/67) |
| E4 | **iOS app never updates** (cache) | ⏸️ | `/play` 303 + cache bust | [#63](https://github.com/MonMonMars/amoji_engine_02/pull/63) |

### F — Roster & models

| ID | Problem / request | Status | Evidence / fix | PR / build |
|----|-------------------|--------|----------------|------------|
| F1 | **Kizuna / roster #2** model load fail | ✅ | `verify:roster-models` | **v558** |
| F2 | Replace roster slots (R3 CC0) | ✅ | Cache revision **v561** | [#99](https://github.com/MonMonMars/amoji_engine_02/pull/99) |
| F4 | **Elio** flat color blocks | ✅ | AvatarSample C + previews | **v557** |
| F3 | Unique VRM per character id | ⏸️ | Allowed dup groups in test | ongoing |
| F5 | **Sendagaya #24–27** lighting harsh vs Alicia | 🟡 | Alicia-like MToon bands | [#109](https://github.com/MonMonMars/amoji_engine_02/pull/109) `cursor/sendagaya-lighting-alicia-54db` |

### G — Character switch & session (new)

| ID | Problem / request | Status | Evidence / fix | PR / build |
|----|-------------------|--------|----------------|------------|
| G1 | After switch, **chip name** / **TTS voice** stay on previous character | 🟡 | `syncCharacterSessionIdentity` on confirm; E2E name/voice notes | [#110](https://github.com/MonMonMars/amoji_engine_02/pull/110) **v591** |
| G2 | Switch causes **many reloads** / multiple VRMs in memory | 🟡 | Single hot swap, dispose retiring avatar, no stale `beginAvatarLoad` → hotSwap chain | [#110](https://github.com/MonMonMars/amoji_engine_02/pull/110) **v592** |
| G3 | Switch leaves **T-pose / springs** broken until refresh | 🟡 | `warmPresentFrame` + `reapplyPlantedLimbs`; **v593** idle forearm + spring post-pass | **v593** branch |

### H — Docs / business

| ID | Problem / request | Status | Evidence / fix | PR / build |
|----|-------------------|--------|----------------|------------|
| H1 | **B2B + B2C business plan** | 📋 | | [#87](https://github.com/MonMonMars/amoji_engine_02/pull/87) |
| H2 | **This tracker** — expand list, mark solved/not | 🟡 | Updated 2026-09-25 with G* rows + Mon B1/B5/B6 report | this file |

*(Legacy G1/G2 in old tracker = business/tracker; renumbered to H1/H2.)*

---

## Mon request log (chronological, expanded)

| When | Mon said (paraphrase) | Tracker IDs | Outcome |
|------|------------------------|-------------|---------|
| 2026-09-25 | Still **blended T-pose**, **wind from below**, **blended hair/skirt**; update chart; most not fixed | B1, B5, B6, E2, H2 | **v593** coded 🟡; prod still old until merge |
| 2026-09-25 | Sendagaya lighting vs Alicia | F5 | PR **#109** 🟡 |
| 2026-09-25 | Switch name/voice wrong; reload/memory | G1, G2 | PR **#110** 🟡 |
| 2026-09-23 PM | Waves 3–4 cache/springs/arms | A1, B5, B1 | Merged #97–#98; Mon still sees B1/B5/B6 on prod |

---

## Open PR queue (merge priority suggestion)

1. **B1/B5/B6** — `cursor/fix-idle-tpose-springs-54db` (**v593**)  
2. **G1/G2** — [#110](https://github.com/MonMonMars/amoji_engine_02/pull/110) switch identity + single model  
3. **F5** — [#109](https://github.com/MonMonMars/amoji_engine_02/pull/109) Sendagaya lighting  
4. **A5** — roster PNG regen when session idle matches **v593**  

After each merge: `npm run verify:pre-delivery:prod` → exit **0** before telling Mon it’s live.

---

## E2E checks map (`companion-issues-verify.mjs`)

| Check name | Related IDs |
|------------|-------------|
| `build-id` | all |
| `spring-gravity-down` | B5 |
| `feet-planted` | B7 |
| `switch-character-chip-name` / `switch-character-voice-note` | G1 |
| `switch-character-model` | G2, F1, A5 |
| `mouth-moves-when-talking` | D1 |
| `picker-hero-scene-preview` | A8 |

---

## One-line summary for Mon (2026-09-25)

**Live prod** is still on an older build (~**v563**): your **T-pose / upward wind / hair-skirt** report matches **B1/B5/B6 🔴 on prod**. **v593** on branch locks idle forearms and adds a post-spring gravity/damp pass — **deploy pending** until merged. Switch fixes are in **#110** (also pending). Bookmark **`/play`**.

---

## Agent checklist (every fix)

1. Read this file; pick row IDs you touch.  
2. Implement + `npm run verify:pre-delivery`.  
3. Merge → wait deploy → `npm run verify:pre-delivery:prod`.  
4. Update table: 🟡 → ✅ only when prod build matches and Mon’s symptom is covered.  
5. Add a line to **Mon request log** if new wording from Mon.
